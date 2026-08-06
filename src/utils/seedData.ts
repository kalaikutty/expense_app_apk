import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { NewTransaction } from '../types';

export async function seedSampleTransactions(userId?: string): Promise<number> {
  const now = new Date();
  
  const sampleData: Omit<NewTransaction, 'createdAt'>[] = [
    {
      type: 'CREDIT',
      amount: 85000.00,
      title: 'Monthly Salary',
      category: 'Salary',
      note: 'ACME Corp August Salary Credited',
      date: new Date(now.getFullYear(), now.getMonth(), 1, 9, 30).toISOString(),
      source: 'EXCEL',
    },
    {
      type: 'DEBIT',
      amount: 12500.00,
      title: 'House Rent Payment',
      category: 'Rent',
      note: 'Rent paid via Bank Transfer',
      date: new Date(now.getFullYear(), now.getMonth(), 1, 14, 0).toISOString(),
      source: 'MANUAL',
    },
    {
      type: 'DEBIT',
      amount: 2450.00,
      title: 'Groceries at DMart',
      category: 'Groceries',
      note: 'Weekly essentials and supplies',
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 18, 15).toISOString(),
      source: 'EXCEL',
    },
    {
      type: 'DEBIT',
      amount: 680.00,
      title: 'Dinner at Punjab Grill',
      category: 'Food & Dining',
      note: 'Weekend dinner with family',
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 45).toISOString(),
      source: 'MANUAL',
    },
    {
      type: 'DEBIT',
      amount: 3200.00,
      title: 'Electricity & Water Bill',
      category: 'Bills & Utilities',
      note: 'Monthly BESCOM utility payment',
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 11, 20).toISOString(),
      source: 'EXCEL',
    },
    {
      type: 'CREDIT',
      amount: 5000.00,
      title: 'Freelance Design Bonus',
      category: 'Business',
      note: 'Client project milestone completion',
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0).toISOString(),
      source: 'MANUAL',
    },
    {
      type: 'DEBIT',
      amount: 1850.00,
      title: 'Fuel refill at Shell',
      category: 'Transport',
      note: 'Petrol for car',
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 30).toISOString(),
      source: 'EXCEL',
    },
    {
      type: 'DEBIT',
      amount: 4500.00,
      title: 'New Running Shoes',
      category: 'Shopping',
      note: 'Decathlon sports footwear',
      date: new Date(now.getFullYear(), now.getMonth(), Math.max(1, now.getDate() - 5), 16, 0).toISOString(),
      source: 'MANUAL',
    }
  ];

  let addedCount = 0;
  for (const item of sampleData) {
    const payload: any = {
      ...item,
      createdAt: serverTimestamp(),
    };
    if (userId) {
      payload.userId = userId;
    }
    await addDoc(collection(db, 'transactions'), payload);
    addedCount++;
  }

  return addedCount;
}
