export default eventHandler(() => {
  throw createError({
    status: 404,
  });
});
