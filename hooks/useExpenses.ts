'use client';

import { useState, useEffect, useCallback } from 'react';
import { Expense } from '@/types/expense';
import {
  loadExpenses,
  addExpense,
  updateExpense,
  deleteExpense,
  generateId,
} from '@/lib/storage';

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setExpenses(loadExpenses());
    setIsLoaded(true);
  }, []);

  const add = useCallback(
    (data: Omit<Expense, 'id' | 'createdAt'>) => {
      const expense: Expense = {
        ...data,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      const updated = addExpense(expense);
      setExpenses(updated);
      return expense;
    },
    []
  );

  const update = useCallback((expense: Expense) => {
    const updated = updateExpense(expense);
    setExpenses(updated);
  }, []);

  const remove = useCallback((id: string) => {
    const updated = deleteExpense(id);
    setExpenses(updated);
  }, []);

  return { expenses, isLoaded, add, update, remove };
}
