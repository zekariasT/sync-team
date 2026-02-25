// import { Injectable } from "@nestjs/common";
// import { PrismaService } from "../prisma.service.js";
// import { Product } from "./product.interface.js";

// @Injectable()
// export class ProductService {
//     constructor(private prisma: PrismaService) {}

//     async findAll(): Promise<Product[]> {
//         return await this.prisma.product.findMany();
//     }

//     async create(data: { name: string; category: string; price: number; quantity: number }) {
//         return this.prisma.product.create({ data });
//     }
// }