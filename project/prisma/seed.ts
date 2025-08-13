import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: hashedPassword,
      role: Role.ADMIN,
    },
  });

  console.log('✅ Admin user created:', admin.email);

  // Create sample products
  const products = [
    {
      title: 'iPhone 15 Pro',
      description: 'Latest Apple iPhone with advanced features',
      priceFils: 399900, // 3999.00 AED in fils
      stock: 50,
    },
    {
      title: 'Samsung Galaxy S24',
      description: 'Premium Android smartphone',
      priceFils: 349900, // 3499.00 AED in fils
      stock: 30,
    },
    {
      title: 'MacBook Pro M3',
      description: '14-inch MacBook Pro with M3 chip',
      priceFils: 799900, // 7999.00 AED in fils
      stock: 20,
    },
    {
      title: 'iPad Air',
      description: '10.9-inch iPad Air with M1 chip',
      priceFils: 239900, // 2399.00 AED in fils
      stock: 25,
    },
    {
      title: 'Apple Watch Series 9',
      description: 'Smartwatch with health monitoring',
      priceFils: 149900, // 1499.00 AED in fils
      stock: 40,
    },
    {
      title: 'AirPods Pro',
      description: 'Wireless earbuds with noise cancellation',
      priceFils: 99900, // 999.00 AED in fils
      stock: 60,
    },
    {
      title: 'Dell XPS 13',
      description: 'Ultra-thin laptop for professionals',
      priceFils: 459900, // 4599.00 AED in fils
      stock: 15,
    },
    {
      title: 'Sony WH-1000XM5',
      description: 'Premium noise-canceling headphones',
      priceFils: 139900, // 1399.00 AED in fils
      stock: 35,
    },
    {
      title: 'Nintendo Switch OLED',
      description: 'Portable gaming console',
      priceFils: 129900, // 1299.00 AED in fils
      stock: 45,
    },
    {
      title: 'Samsung 55" 4K TV',
      description: 'Smart TV with crystal display',
      priceFils: 199900, // 1999.00 AED in fils
      stock: 10,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { title: product.title },
      update: {},
      create: product,
    });
  }

  console.log('✅ Sample products created');
  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });