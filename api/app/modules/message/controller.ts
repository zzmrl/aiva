import type { RequestHandler } from "express";
import * as service from "./service";

export const list: RequestHandler = async (req, res) => {
  const phone = req.query.phone as string | undefined;
  const messages = await service.list({ phone });
  res.json(messages);
};

export const getById: RequestHandler = async (req, res) => {
  const id = Number(req.params.id);
  const message = await service.findById(id);
  res.json(message);
};

export const create: RequestHandler = async (req, res) => {
  const message = await service.create(req.body);
  res.status(201).json(message);
};
