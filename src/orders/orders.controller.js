const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");

// /orders handlers

function orderExists(request, response, next) {
  const { orderId } = request.params;
  const foundOrder = orders.find((order) => order.id === orderId);
  if (foundOrder) {
    response.locals.order = foundOrder;
    return next();
  }
  next({
    status: 404,
    message: `Order does not exist: ${orderId}`,
  });
}

function bodyDataHas(propertyName) {
  return function (request, response, next) {
    const { data = {} } = request.body;
    if (data[propertyName]) {
      return next();
    }
    next({ status: 400, message: `Order must include a ${propertyName}` });
  };
}

function quantityIsValidNumber(request, response, next) {
  const { data: { dishes } = {} } = request.body;
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

function dishesAreValidArray(request, response, next) {
  const { data: { dishes } = {} } = request.body;
  if (!Array.isArray(dishes) || dishes.length < 1) {
    return next({
      status: 400,
      message: `Order must include at least one dish`,
    });
  }
  next();
}

function statusIsValid(request, response, next) {
  const { data: { status } = {} } = request.body;
  const validStatuses = [
    "pending",
    "preparing",
    "out-for-delivery",
    "delivered",
  ];
  if (!status || !validStatuses.includes(status)) {
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

function statusCanBeDeleted(request, response, next) {
  const order = response.locals.order;
  if (order.status !== "pending") {
    return next({
      status: 400,
      message: `An order cannot be deleted unless it is pending`,
    });
  }
  next();
}

function idMatchesOrderId(request, response, next) {
  const { orderId } = request.params;
  const { data: { id } = {} } = request.body;
  if (id && id != orderId) {
    return next({
      status: 400,
      message: `Order id does not match route id. Order: ${id}, Route: ${orderId}`,
    });
  }
  next();
}

function list(request, response) {
  response.json({ data: orders });
}

function create(request, response) {
  const { data: { deliverTo, mobileNumber, status, dishes } = {} } = request.body;
  const newOrder = {
    id: nextId(),
    deliverTo,
    mobileNumber,
    status,
    dishes,
  };
  orders.push(newOrder);
  response.status(201).json({ data: newOrder });
}

function read(request, response) {
  response.json({ data: response.locals.order });
}

function update(request, response) {
  const order = response.locals.order;
  const { data: { deliverTo, mobileNumber, status, dishes } = {} } = request.body;
  order.deliverTo = deliverTo;
  order.mobileNumber = mobileNumber;
  order.status = status;
  order.dishes = dishes;

  response.json({ data: order });
}

function destroy(request, response) {
  const { orderId } = request.params;
  const index = orders.findIndex((order) => order.id === orderId);
  orders.splice(index, 1);
  response.sendStatus(204);
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
