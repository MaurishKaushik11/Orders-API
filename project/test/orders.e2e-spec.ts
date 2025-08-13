import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { Role, OrderStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

describe('Orders (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let customerToken: string;
  let productId: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    prisma = app.get<PrismaService>(PrismaService);
    await app.init();

    // Create admin user
    const hashedPassword = await bcrypt.hash('password123', 10);
    await prisma.user.create({
      data: {
        email: 'admin@example.com',
        passwordHash: hashedPassword,
        role: Role.ADMIN,
      },
    });

    // Login as admin
    const adminResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'password123',
      });
    adminToken = adminResponse.body.accessToken;

    // Register customer
    const customerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'customer@example.com',
        password: 'password123',
      });
    customerToken = customerResponse.body.accessToken;

    // Create test product
    const product = await prisma.product.create({
      data: {
        title: 'Test Product',
        description: 'Test Description',
        priceFils: 10000,
        stock: 100,
      },
    });
    productId = product.id;
  });

  afterEach(async () => {
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  describe('/orders (POST)', () => {
    it('should create order successfully', async () => {
      const createOrderDto = {
        items: [
          {
            productId: productId,
            qty: 2,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(createOrderDto)
        .expect(201);

      expect(response.body.status).toBe('PENDING');
      expect(response.body.totalFils).toBe(20000);
      expect(response.body.items).toHaveLength(1);

      // Check stock was decremented
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });
      expect(product.stock).toBe(98);
    });

    it('should fail with insufficient stock', async () => {
      const createOrderDto = {
        items: [
          {
            productId: productId,
            qty: 200, // More than available stock
          },
        ],
      };

      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(createOrderDto)
        .expect(400);
    });

    it('should fail with negative quantity', async () => {
      const createOrderDto = {
        items: [
          {
            productId: productId,
            qty: -1,
          },
        ],
      };

      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(createOrderDto)
        .expect(400);
    });
  });

  describe('/orders (GET)', () => {
    let orderId: string;

    beforeEach(async () => {
      // Create test order
      const createOrderDto = {
        items: [
          {
            productId: productId,
            qty: 1,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(createOrderDto);

      orderId = response.body.id;
    });

    it('should get customer orders', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(orderId);
    });

    it('should get all orders as admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('/orders/:id/status (PATCH)', () => {
    let orderId: string;

    beforeEach(async () => {
      // Create test order
      const createOrderDto = {
        items: [
          {
            productId: productId,
            qty: 1,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(createOrderDto);

      orderId = response.body.id;
    });

    it('should update order status as admin', async () => {
      const updateStatusDto = {
        status: OrderStatus.PAID,
      };

      const response = await request(app.getHttpServer())
        .patch(`/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateStatusDto)
        .expect(200);

      expect(response.body.status).toBe('PAID');
    });

    it('should fail to update status as customer', async () => {
      const updateStatusDto = {
        status: OrderStatus.PAID,
      };

      await request(app.getHttpServer())
        .patch(`/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send(updateStatusDto)
        .expect(403);
    });
  });
});