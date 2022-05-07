import OrderRepository from "../repository/OrderRepository.js";
import { sendMessageToProductStockUpdateQueue } from "../../product/rabbitmq/productStockUpdateSender.js";
import { PENDING, ACCEPTED, REJECTED } from "../status/OrderStatus.js";

import OrderException from '../../sales/exception/OrderException.js';

import ProductClient from "../../product/client/ProductClient.js";

import { BAD_REQUEST, SUCCESS, INTERNAL_SERVER_ERROR, } from "../../../config/constants/httpStatus.js";

class OrderService {
    async createOrder(req) {
        try {
            let orderData = req.body;
            const { transactionid, serviceid } = req.headers;
            console.info(
                `Request to POST new order with data ${JSON.stringify(
                    orderData
                )} | [transactionID: ${transactionid} | serviceID: ${serviceid}]`
            );
            this.validateOrderData(orderData);
            const { authUser } = req;
            const { authorization } = req.headers;
            let order = this.createInitialOrderData(orderData, authUser);
            await this.validateProductStock(order, authorization, transactionid);
            let createdOrder = await OrderRepository.save(order);
            this.sendMessage(createdOrder);
            let response = {
                status: SUCCESS,
                createdOrder,
            };
            console.info(
                `Response to POST login with data ${JSON.stringify(
                    response
                )} | [transactionID: ${transactionid} | serviceID: ${serviceid}]`
            );
            return response;
        } catch (err) {
            return {
                status: err.status ? err.status : INTERNAL_SERVER_ERROR,
                message: err.message,
            };
        }
    }

    validateOrderData(data) {
        if (!data || !data.products) {
            throw new OrderException(BAD_REQUEST, "The products must be informed.");
        }
    }

    sendMessage(createdOrder) {
        const message = {
            salesId: createdOrder.id,
            products: createdOrder.products,
        };
        sendMessageToProductStockUpdateQueue(message);
    }

    createInitialOrderData(orderData, authUser) {
        return {
            status: PENDING,
            user: authUser,
            createdAt: new Date(),
            updatedAt: new Date(),
            products: orderData.products,
        };
    }

    async updateOrder(orderMessage) {
        try {
            const order = JSON.parse(orderMessage);
            if (order.salesId && order.status) {
                let existingOrder = await OrderRepository.findById(order.salesId);
                if (existingOrder && order.status !== existingOrder.status) {
                    existingOrder.status = order.status;
                    existingOrder.updatedAt = new Date();
                    await OrderRepository.save(existingOrder);
                }
            } else {
                console.warn("The order message was not complete.");
            }
        } catch (err) {
            console.error("Could not parse order message from queue.");
            console.error(err.message);
        }
    }

    async validateProductStock(order, token, transactionid) {
        let stockIsOk = await ProductClient.checkProducStock(order, token, transactionid);
        if (!stockIsOk) {
            throw new OrderException(
                BAD_REQUEST,
                "The stock is out for the products."
            );
        }
    }

    async findById(req) {
        try {
            const { id } = req.params;
            this.validateInformedId(id);
            const existingOrder = await OrderRepository.findById(id);
            if (!existingOrder) {
                throw new OrderException(BAD_REQUEST, "The order was not found.");
            }
            return {
                status: SUCCESS,
                existingOrder,
            };
        } catch (err) {
            return {
                status: err.status ? err.status : INTERNAL_SERVER_ERROR,
                message: err.message,
            };
        }
    }

    async findAll() {
        try {
            const orders = await OrderRepository.findAll();
            if (!orders) {
                throw new OrderException(BAD_REQUEST, "No orders were found.");
            }
            return {
                status: SUCCESS,
                orders,
            };
        } catch (err) {
            return {
                status: err.status ? err.status : INTERNAL_SERVER_ERROR,
                message: err.message,
            };
        }
    }

    async findbyProductId(req) {
        try {
            const { productId } = req.params;
            this.validateInformedProductId(productId);
            const orders = await OrderRepository.findByProductId(productId);
            if (!orders) {
                throw new OrderException(BAD_REQUEST, "No orders were found.");
            }
            return {
                status: SUCCESS,
                salesIds: orders.map((order) => {
                    return order.id;
                }),
            };
        } catch (err) {
            return {
                status: err.status ? err.status : INTERNAL_SERVER_ERROR,
                message: err.message,
            };
        }
    }



    validateInformedProductId(id) {
        if (!id) {
            throw new OrderException(
                BAD_REQUEST,
                "The order's productId must be informed."
            );
        }
    }


    validateInformedId(id) {
        if (!id) {
            throw new OrderException(BAD_REQUEST, "The order ID must be informed.");
        }
    }
}

export default new OrderService();