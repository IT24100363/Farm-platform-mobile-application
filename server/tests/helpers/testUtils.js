import mongoose from 'mongoose';
import { vi } from 'vitest';

export const createMockResponse = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res;
};

export const createMockApp = () => {
  const io = {
    to: vi.fn().mockReturnThis(),
    emit: vi.fn()
  };

  const app = {
    get: vi.fn((key) => (key === 'io' ? io : undefined))
  };

  return { app, io };
};

export const createMockDoc = (data = {}, extra = {}) => {
  const doc = { ...data, ...extra };
  if (!doc.save) doc.save = vi.fn().mockResolvedValue(doc);
  if (!doc.deleteOne) doc.deleteOne = vi.fn().mockResolvedValue(doc);
  if (!doc.toObject) doc.toObject = () => ({ ...doc });
  return doc;
};

export const createQuery = (result) => {
  const query = {
    populate: vi.fn(() => query),
    select: vi.fn(() => query),
    sort: vi.fn(() => query),
    session: vi.fn(() => query),
    skip: vi.fn(() => query),
    limit: vi.fn(() => query),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject)
  };

  return query;
};

export const createObjectId = () => new mongoose.Types.ObjectId();

export const daysFromNow = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);
