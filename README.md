# Mini Orders API

A production-ready backend API for a mini e-commerce service built with NestJS, TypeScript, PostgreSQL, and Prisma.

## Features

- 🔐 JWT Authentication with access & refresh tokens
- 👥 Role-based access control (Admin/Customer)
- 🛍️ Product management with pagination and search
- 📦 Order management with stock tracking
- 🔒 Comprehensive validation and error handling
- 🚦 Rate limiting and security headers
- 📝 Request logging with correlation IDs
- 🧪 Comprehensive test coverage
- 🐳 Docker support
- 🚀 CI/CD with GitHub Actions

## Tech Stack

- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (Access + Refresh tokens)
- **Validation**: class-validator
- **Testing**: Jest + Supertest
- **Documentation**: Swagger/OpenAPI
- **Security**: Helmet, Rate limiting, CORS
- **Logging**: Structured logging with request IDs
- **DevOps**: Docker, GitHub Actions, Husky

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL 13+
- Docker (optional)

### Environment Setup

1. Copy the environment file:
```bash
cp .env.example .env
```

2. Update `.env` with your database credentials and secrets:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/mini_orders_db?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-in-production"
```

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Generate Prisma client:
```bash
npm run prisma:generate
```

3. Run database migrations:
```bash
npm run prisma:dev
```

4. Seed the database:
```bash
npm run prisma:seed
```

5. Start the development server:
```bash
npm run start:dev
```

The API will be available at `http://localhost:3000`
API Documentation: `http://localhost:3000/api-docs`

### Docker Setup

1. Start services with Docker Compose:
```bash
docker-compose up
```

This will start PostgreSQL and the API server with all migrations and seeds applied automatically.

## Assumptions

- Currency stored in fils (integer minor units) for precise pricing.
- Default roles: ADMIN and USER. Seeded admin user is `admin@example.com` with password `admin123`.
- Idempotency window ~5 seconds using the `Idempotency-Key` header to prevent duplicate orders.
- Expected database: PostgreSQL 13+ with `public` schema; configured via `DATABASE_URL`.
- Rate limiting defaults: TTL = 60 seconds, limit = 10 requests per window (configurable via env).

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user  
- `POST /auth/refresh` - Refresh tokens
- `GET /auth/me` - Get user profile (protected)

### Products
- `POST /products` - Create product (Admin only)
- `GET /products` - List products with pagination/search
- `GET /products/:id` - Get product by ID
- `PATCH /products/:id` - Update product (Admin only)
- `DELETE /products/:id` - Delete product (Admin only)

### Orders
- `POST /orders` - Create new order (with idempotency support)
- `GET /orders` - List orders (own orders for customers, all for admin)
- `GET /orders/:id` - Get order details
- `PATCH /orders/:id/status` - Update order status (Admin only)

## Data Models

### User
- `id` (UUID) - Primary key
- `email` (string, unique) - User email
- `passwordHash` (string) - Hashed password
- `role` (enum) - USER or ADMIN
- `createdAt` (timestamp) - Creation date

### Product  
- `id` (UUID) - Primary key
- `title` (string) - Product name
- `description` (string, optional) - Product description
- `priceFils` (integer) - Price in fils (1 AED = 100 fils)
- `stock` (integer) - Available quantity
- `isActive` (boolean) - Product status
- `createdAt` (timestamp) - Creation date

### Order
- `id` (UUID) - Primary key
- `userId` (UUID) - Reference to user
- `status` (enum) - PENDING, PAID, CANCELLED, FULFILLED
- `totalFils` (integer) - Total price in fils
- `createdAt` (timestamp) - Order date

### OrderItem
- `id` (UUID) - Primary key
- `orderId` (UUID) - Reference to order
- `productId` (UUID) - Reference to product
- `qty` (integer) - Quantity ordered
- `unitPriceFils` (integer) - Price per unit in fils
- `lineTotalFils` (integer) - Line total in fils

## Testing

### Run all tests:
```bash
npm test
```

### Run e2e tests:
```bash
npm run test:e2e
# Serial mode (stable)
npm run test:e2e:serial
```

### Run tests with coverage:
```bash
npm run test:cov
```

### Test Coverage

The test suite covers:
- ✅ Authentication flow (register, login, refresh)
- ✅ Product CRUD operations with role-based access
- ✅ Order creation with stock validation
- ✅ Order listing and status updates
- ✅ Validation errors and edge cases
- ✅ Pagination and search functionality

## Security Features

- 🔐 Password hashing with bcrypt
- 🛡️ JWT tokens with expiration
- 🚦 Rate limiting on authentication endpoints  
- 🔒 Role-based access control
- 🛡️ Request validation and sanitization
- 📝 Security headers with Helmet
- 🔄 CORS configuration

## Development Tools

### Code Quality
- ESLint for linting
- Prettier for formatting
- Husky for pre-commit hooks
- lint-staged for staged file linting

### Database
```bash
# Reset database
npm run db:reset

# Run migrations
npm run prisma:migrate

# Seed database  
npm run prisma:seed

# Generate Prisma client
npm run prisma:generate
```

### Linting
```bash
npm run lint        # Check for issues
npm run lint:fix    # Fix auto-fixable issues
npm run format      # Format with Prettier
```

## Default Users

The seed script creates:
- **Admin User**: `admin@example.com` / `admin123`
- **Sample Products**: 10 products with realistic pricing

## Key Features Implementation

### Idempotency
Orders support idempotency using the `Idempotency-Key` header to prevent duplicate orders within 5 seconds.

### Stock Management  
Stock is automatically decremented when orders are placed and validated before order creation.

### Logging
All requests include correlation IDs for traceability and structured logging.

### Error Handling
Consistent error responses with:
```json
{
  "code": 400,
  "message": "Validation failed",
  "details": {...},
  "requestId": "uuid",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/endpoint"
}
```

### Pagination
List endpoints support cursor-based pagination:
```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## CI/CD Pipeline

GitHub Actions workflow includes:
- ✅ Dependency caching
- ✅ Linting and formatting checks
- ✅ Unit and e2e test execution  
- ✅ Database setup with migrations
- ✅ Multi-environment support

## Production Considerations

### Environment Variables
Ensure all secrets are properly configured:
- Use strong JWT secrets (256-bit recommended)
- Configure appropriate token expiry times
- Set up proper database credentials
- Configure rate limiting based on expected load

### Scaling
- Database connection pooling via Prisma
- Horizontal scaling support (stateless design)
- Redis integration ready for caching
- Load balancer friendly

### Monitoring
- Request correlation IDs for tracing
- Structured logging for observability  
- Health check endpoints ready
- Error tracking integration points

## Submission Checklist

Include the following in your submission (Git repo or ZIP of `project/`):

- Project code: `src/`, `test/`, `prisma/`, `package.json`, `package-lock.json`, `nest-cli.json`, `tsconfig.json`, `Dockerfile`, `docker-compose.yml`, `.eslintrc.js`, `.prettierrc`, `.husky/`, `README.md`, `.env.example`
- Exclude: `node_modules/`, `dist/`, `coverage/`
- Prisma assets: `prisma/schema.prisma`, `prisma/migrations/**`, `prisma/seed.ts`
- Tests: All e2e tests in `test/`
- Optional: Postman collection and/or link to Swagger `http://localhost:3000/api-docs`

## License

This project is licensed under the MIT License.