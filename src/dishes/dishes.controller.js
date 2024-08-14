const path = require("path");

// Use the existing dishes data
const dishes = require(path.resolve("src/data/dishes-data"));

// Use this function to assign ID's when necessary
const nextId = require("../utils/nextId");

// /dishes handlers

function dishExists(request, response, next) {
  const { dishId } = request.params;
  const foundDish = dishes.find((dish) => dish.id === dishId);
  if (foundDish) {
    response.locals.dish = foundDish;
    return next();
  }
  next({
    status: 404,
    message: `Dish does not exist: ${dishId}`,
  });
}

function bodyDataHas(propertyName) {
  return function (request, response, next) {
    const { data = {} } = request.body;
    if (data[propertyName]) {
      return next();
    }
    next({ status: 400, message: `Dish must include a ${propertyName}` });
  };
}

function priceIsValidNumber(request, response, next) {
  const { data: { price } = {} } = request.body;
  if (price <= 0 || !Number.isInteger(price)) {
    return next({
      status: 400,
      message: `Dish must have a price that is an integer greater than 0`,
    });
  }
  next();
}

function idMatchesDishId(request, response, next) {
  const { dishId } = request.params;
  const { data: { id } = {} } = request.body;
  if (id && id !== dishId) {
    return next({
      status: 400,
      message: `Dish id does not match route id. Dish: ${id}, Route: ${dishId}`,
    });
  }
  next();
}

function list(request, response) {
  response.json({ data: dishes });
}

function create(request, response) {
  const { data: { name, description, price, image_url } = {} } = request.body;
  const newDish = {
    id: nextId(),
    name,
    description,
    price,
    image_url,
  };
  dishes.push(newDish);
  response.status(201).json({ data: newDish });
}

function read(request, response) {
  response.json({ data: response.locals.dish });
}

function update(request, response) {
  const dish = response.locals.dish;
  const { data: { name, description, price, image_url } = {} } = request.body;
  dish.name = name;
  dish.description = description;
  dish.price = price;
  dish.image_url = image_url;

  response.json({ data: dish });
}

module.exports = {
  list,
  read: [dishExists, read],
  create: [
    bodyDataHas("name"),
    bodyDataHas("description"),
    bodyDataHas("price"),
    bodyDataHas("image_url"),
    priceIsValidNumber,
    create,
  ],
  update: [
    dishExists,
    bodyDataHas("name"),
    bodyDataHas("description"),
    bodyDataHas("price"),
    bodyDataHas("image_url"),
    priceIsValidNumber,
    idMatchesDishId,
    update,
  ],
};
