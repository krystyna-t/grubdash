const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");

// /orders handlers

function orderExists(req, res, next) {
  const { orderId } = req.params;
  const foundOrder = orders.find((order) => order.id === orderId);
  if (foundOrder) {
    res.locals.order = foundOrder;
    return next();
  }
  next({
    status: 404,
    message: `Order does not exist: ${orderId}`,
  });
}

function bodyDataHas(propertyName) {
  return function (req, res, next) {
    const { data = {} } = req.body;
    if (data[propertyName]) {
      return next();
    }
    next({ status: 400, message: `Order must include a ${propertyName}` });
  };
}

function quantityIsValidNumber(req, res, next) {
  const { data: { dishes } = {} } = req.body;
  for (let [index, dish] of dishes.entries()) {
    if (!Number.isInteger(dish.quantity) || dish.quantity <= 0) {
      return next({
        status: 400,
        message: `dish ${index} must have a quantity that is an integer greater than 0`,
      });
    }
  }

  next();
}

function dishesAreValidArray(req, res, next) {
  const { data: { dishes } = {} } = req.body;
  if (!Array.isArray(dishes) || dishes.length < 1) {
    return next({
      status: 400,
      message: `Order must include at least one dish`,
    });
  }
  next();
}

function statusIsValid(req, res, next) {
  const { data: { status } = {} } = req.body;
  if (!status) {
    return next({
      status: 400,
      message: `Order must have a status of pending, preparing, out-for-delivery, delivered`,
    });
  }
  if (status === "delivered") {
    return next({
      status: 400,
      message: `A delivered order cannot be changed`,
    });
  }
  next();
}

function statusCanBeDeleted(req, res, next) {
  const order = res.locals.order;
  if (order.status !== "pending") {
    return next({
      status: 400,
      message: `An order cannot be deleted unless it is pending`,
    });
  }
  next();
}

function idMatchesOrderId(req, res, next) {
  const { orderId } = req.params;
  const { data: { id } = {} } = req.body;
  if (id && id != orderId) {
    return next({
      status: 400,
      message: `Order id does not match route id. Order: ${id}, Route: ${orderId}`,
    });
  }
  next();
}

function list(req, res) {
  res.json({ data: orders });
}

function create(req, res) {
  const { data: { deliverTo, mobileNumber, status, dishes } = {} } = req.body;
  const newOrder = {
    id: nextId(),
    deliverTo,
    mobileNumber,
    status,
    dishes,
  };
  orders.push(newOrder);
  res.status(201).json({ data: newOrder });
}

function read(req, res) {
  res.json({ data: res.locals.order });
}

function update(req, res) {
  const order = res.locals.order;
  const { data: { id, deliverTo, mobileNumber, status, dishes } = {} } =
    req.body;
  order.deliverTo = deliverTo;
  order.mobileNumber = mobileNumber;
  order.status = status;
  order.dishes = dishes;

  res.json({ data: order });
}

function destroy(req, res) {
  const { orderId } = req.params;
  const index = orders.findIndex((order) => order.id === orderId);
  orders.splice(index, 1);
  res.sendStatus(204);
}

module.exports = {
  list,
  read: [orderExists, read],
  create: [
    bodyDataHas("deliverTo"),
    bodyDataHas("mobileNumber"),
    bodyDataHas("dishes"),
    dishesAreValidArray,
    quantityIsValidNumber,
    create,
  ],
  update: [
    orderExists,
    bodyDataHas("deliverTo"),
    bodyDataHas("mobileNumber"),
    bodyDataHas("dishes"),
    dishesAreValidArray,
    quantityIsValidNumber,
    statusIsValid,
    idMatchesOrderId,
    update,
  ],
  delete: [orderExists, statusCanBeDeleted, destroy],
};
