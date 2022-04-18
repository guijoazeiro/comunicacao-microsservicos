package br.com.cursoudemy.productapi.modules.product.repository;

import br.com.cursoudemy.productapi.modules.product.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductRepository extends JpaRepository<Product, Integer> {
}
