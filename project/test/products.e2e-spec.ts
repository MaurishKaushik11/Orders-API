import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

describe('Products (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let customerToken: string;

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
  });

  afterEach(async () => {
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  describe('/products (POST)', () => {
    it('should create product as admin', async () => {
      const createProductDto = {
        title: 'Test Product',
        description: 'Test Description',
        priceFils: 10000,
        stock: 100,
      };

      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createProductDto)
        .expect(201);

      expect(response.body.title).toBe('Test Product');
      expect(response.body.priceFils).toBe(10000);
    });

    it('should fail to create product as customer', async () => {
      const createProductDto = {
        title: 'Test Product',
        description: 'Test Description',
        priceFils: 10000,
        stock: 100,
      };

      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(createProductDto)
        .expect(403);
    });

    it('should fail with invalid data', async () => {
      const createProductDto = {
        title: '',
        priceFils: -100,
        stock: -10,
      };

      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createProductDto)
        .expect(400);
    });
  });

  describe('/products (GET)', () => {
    beforeEach(async () => {
      // Create test products
      await prisma.product.createMany({
        data: [
          {
            title: 'Product 1',
            description: 'Description 1',
            priceFils: 10000,
            stock: 10,
          },
          {
            title: 'Product 2',
            description: 'Description 2',
            priceFils: 20000,
            stock: 20,
          },
        ],
      });
    });

    it('should get products with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/products?page=1&limit=10')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta).toHaveProperty('page', 1);
      expect(response.body.meta).toHaveProperty('limit', 10);
      expect(response.body.meta).toHaveProperty('total', 2);
    });

    it('should search products', async () => {
      const response = await request(app.getHttpServer())
        .get('/products?search=Product 1')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toContain('Product 1');
    });
  });
});