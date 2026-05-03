function buildUpdateSet(payload, allowedFields) {
  const entries = allowedFields
    .filter((field) => payload[field] !== undefined)
    .map((field) => [field, payload[field]]);

  return {
    setClause: entries.map(([field]) => `${field} = ?`).join(', '),
    values: entries.map(([, value]) => value),
    count: entries.length
  };
}

module.exports = {
  buildUpdateSet
};
