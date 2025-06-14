import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart, CartStatus } from '../entities/cart.entity';
import { CartItem } from '../entities/cart-item.entity';
import { PutCartPayload } from 'src/order/type';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
  ) {}

  async findByUserId(userId: string): Promise<Cart | null> {
    return this.cartRepository.findOne({
      where: { user_id: userId },
      relations: ['items'],
    });
  }

  async createByUserId(userId: string): Promise<Cart> {
    const newCart = this.cartRepository.create({
      user_id: userId,
      status: CartStatus.OPEN,
    });

    return this.cartRepository.save(newCart);
  }

  async findOrCreateByUserId(userId: string): Promise<Cart> {
    const existingCart = await this.findByUserId(userId);

    if (existingCart) {
      return existingCart;
    }

    return this.createByUserId(userId);
  }

  async updateByUserId(userId: string, payload: PutCartPayload): Promise<Cart> {
    const cart = await this.findOrCreateByUserId(userId);

    const existingItem = cart.items.find(
      (item) => item.product_id === payload.product.id,
    );

    if (!existingItem) {
      const newItem = this.cartItemRepository.create({
        cart,
        product_id: payload.product.id,
        count: payload.count,
        price: payload.product.price,
      });
      await this.cartItemRepository.save(newItem);
      cart.items.push(newItem);
    } else if (payload.count === 0) {
      await this.cartItemRepository.remove(existingItem);
      cart.items = cart.items.filter((item) => item.id !== existingItem.id);
    } else {
      existingItem.count = payload.count;
      await this.cartItemRepository.save(existingItem);
    }

    return this.cartRepository.save(cart);
  }

  async removeByUserId(userId: string): Promise<void> {
    const cart = await this.findByUserId(userId);

    if (cart) {
      await this.cartRepository.remove(cart);
    }
  }
}