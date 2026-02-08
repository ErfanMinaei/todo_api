import * as Joi from 'joi';

export const createUserSchema = Joi.object({
  first_name: Joi.string().required().min(2).max(50),
  last_name: Joi.string().optional().allow(null).max(50),
  username: Joi.string().required().min(3).max(30).alphanum(),
  password: Joi.string().required().min(8).max(100),
});

export const createTodoListSchema = Joi.object({
  title: Joi.string().required().min(1).max(100),
  userId: Joi.number().integer().positive().required(),
});

export const createTodoSchema = Joi.object({
  title: Joi.string().required().min(1).max(100),
  description: Joi.string().required().max(1000),
  deadline: Joi.date().iso().required(),
  todoListId: Joi.number().integer().positive().required(),
});

export const updateTodoSchema = Joi.object({
  title: Joi.string().optional().min(1).max(100),
  description: Joi.string().optional().max(1000),
  is_done: Joi.boolean().optional(),
  deadline: Joi.date().iso().optional(),
}).min(1);