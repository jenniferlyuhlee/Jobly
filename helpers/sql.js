const { BadRequestError } = require("../expressError");

/**
 * Helper function to translate JS data into node-Postgres-compatible update queries.
 * Fills in column names, new values, and parameterized queries
 * 
 * @param {Object} dataToUpdate - The data to be updated, where keys are model attributes and values are new values.
 * 
 * @param {Object} jsToSql - A mapping of JS-style (camelCase) data fields to SQL column names (snake_case).
 *                           Ex) {firstName: 'first_name', lastName: last_name}
 * 
 * @returns {Object} -  {selCols: 'string of column names separated by ,'
 *                      values: [list of values]}
 */

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
      `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };
