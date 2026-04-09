import type { RequestHandler } from "express";
import * as service from "./service";

export const list: RequestHandler = async (req, res) => {
  const phone = req.query.phone as string | undefined;
  const systemPhone = req.query.systemPhone as string | undefined;
  const messages = await service.list({ phone, systemPhone });
  res.json(messages);
};

export const getById: RequestHandler = async (req, res) => {
  const id = Number(req.params.id);
  const message = await service.getById(id);
  res.json(message);
};

export const listConversations: RequestHandler = async (req, res) => {
  const systemPhone = req.query.systemPhone as string | undefined;
  const conversations = await service.listConversations(systemPhone);
  res.json(conversations);
};

export const listSystemPhones: RequestHandler = async (_req, res) => {
  const phones = await service.listSystemPhones();
  res.json(phones);
};
