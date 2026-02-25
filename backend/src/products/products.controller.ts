// import { Controller, Get, Post, Body } from "@nestjs/common";
// import { ProductService } from "./products.service.js";
// import { Product } from "./product.interface.js";

// @Controller('products')
// export class ProductController {
//     constructor(private readonly productService: ProductService) {}

//     @Get()
//     async findAll(): Promise<Product[]> {
//         return this.productService.findAll();
//     }

//     @Post()
//     async create(@Body() productData: any): Promise<Product> {
//         return await this.productService.create(productData);
//     }

// }