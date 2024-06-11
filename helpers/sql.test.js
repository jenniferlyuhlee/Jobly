const { BadRequestError } = require("../expressError");
const { sqlForPartialUpdate } = require("./sql");

describe('sqlForPartialUpdate', () => {
    test('works: updates single field', () => {
        const result = sqlForPartialUpdate(
            {field1: 'newValue1'},
            {field1: 'field_1'}
        );

        expect(result).toEqual({
            setCols: `"field_1"=$1`,
            values: ['newValue1']
        });
    });

    test('works: updates 3 fields', () => {
        const result = sqlForPartialUpdate(
            {field1: 'newValue1', field2: 'newValue2', field3: 'newValue3'},
            {field1: 'field_1', field2: 'field_2', field3: 'field_3'}
        );

        expect(result).toEqual({
            setCols: `"field_1"=$1, "field_2"=$2, "field_3"=$3`,
            values: ['newValue1', 'newValue2', 'newValue3']
        });
    });

    test('works: sets col name to original key if no jsToSql specified', () => {
        const result = sqlForPartialUpdate(
            {field1: 'newValue1'},
            {}
        );

        expect(result).toEqual({
            setCols: `"field1"=$1`,
            values: ['newValue1']
        });
    });

    test('error: throws error when no data is sent', () => {
        expect(() => {
            sqlForPartialUpdate({}, {field1: 'field_1'})
        }).toThrow();
    });

})
