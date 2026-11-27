export const shippingFor = (itemsPrice) => {
  const threshold = Number(process.env.FREE_SHIPPING_THRESHOLD ?? 5000);
  const fee = Number(process.env.SHIPPING_FEE ?? 99);
  return itemsPrice === 0 || itemsPrice >= threshold ? 0 : fee;
};
