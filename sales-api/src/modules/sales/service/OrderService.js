import OrderRepository from "../repository/OrderRepository.js";
import { sendMessageToProductStockUpdateQueue } from "../../product/rabbitmq/productStockUpdateSender.js";
import { PENDING, ACCEPTED, REJECTED } from "../status/OrderStatus.js";

import OrderException from '../../sales/exception/OrderException.js';

import { BAD_REQUEST, SUCCESS, INTERNAL_SERVER_ERROR, } from "../../../config/constants/httpStatus.js";

class OrderService {
    async createOrder(req) {
        try {
            let orderData = req.body;
            this.validateOrderData(orderData);
            const { authUser } = req;
            let order = {
                status: PENDING,
                user: authUser,
                createdAt: new Date(),
                updateAt: new Date(),
                products: orderData
            };
            await this.validateProductStock(order, authorization);
            let createOrder = await OrderRepository.save(order);
            sendMessageToProductStockUpdateQueue(createOrder.products);
            return {
                status: httpStatus.SUCCESS,
                createOrder
            };
        } catch (err) {
            return {
                status: err.status ? err.status : INTERNAL_SERVER_ERROR,
                message: err.message,
            }
        }
    }
    validateOrderData(data) {
        if (!data || !data.products) {
            throw new OrderException(BAD_REQUEST, "The products must be informed.");
        }
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

    async validateProductStock(order, token) {
        let stockIsOk = await ProductClient.checkProducStock(order, token);
        if (!stockIsOk) {
            throw new OrderException(
                BAD_REQUEST,
                "The stock is out for the products."
            );
        }
    }
}

export default new OrderService();