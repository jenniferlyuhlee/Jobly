"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  testJobIds
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);


async function getId(){
    let jobIdQuery = await db.query(`SELECT id 
                                    FROM jobs
                                    WHERE title = 'J1'`)

    return (jobIdQuery.rows[0].id)
}

/************************************** create */

describe("create", function () {
  const newJob = {
    title: "Test Role",
    salary: 50000,
    equity: 0.095,
    companyHandle: 'c3'
  };

  test("works", async function () {
    let job = await Job.create(newJob);
    expect(job).toEqual({
        id: expect.any(Number),
        title: "Test Role",
        salary: 50000,
        equity: "0.095",
        companyHandle: 'c3'
    });

    const result = await db.query(
          `SELECT title, salary, equity, company_handle AS "companyHandle"
           FROM jobs
           WHERE title = 'Test Role'`);
    expect(result.rows).toEqual([
        {
            title: "Test Role",
            salary: 50000,
            equity: "0.095",
            companyHandle: 'c3'
        }
    ]);
  });

});

/************************************** findAll */

describe("findAll", function () {
  test("works: no filter", async function () {
    let jobs = await Job.findAll();
    
    expect(jobs).toEqual([
        {
            id: expect.any(Number),
            title: "J1",
            salary: 100,
            equity: "0.01",
            companyHandle: "c1"
        },
        {
            id: expect.any(Number),
            title: "J2",
            salary: 200,
            equity: "0.02",
            companyHandle: "c2"
        }
    ]);
  });

/************************************** findAll (filters) */

  test('works: filter by title, salary and equity',async () => {
    let filters = {
      title: 'j',
      minSalary: 100,
      hasEquity: true
    }
    let jobs = await Job.findAll(filters);

    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: "J1",
        salary: 100,
        equity: "0.01",
        companyHandle: "c1"
      },
      {
        id: expect.any(Number),
        title: "J2",
        salary: 200,
        equity: "0.02",
        companyHandle: "c2"
      }
    ]);
  });

  test('works: filter by title', async () => {
    let filters = {
      title: 'J2'
    }
    let jobs = await Job.findAll(filters)

    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: "J2",
        salary: 200,
        equity: "0.02",
        companyHandle: "c2"
      }
    ]);
  });

  test ('works: filter by minSalary', async () => {
    let filters = {
      minSalary: 150
    }

    let jobs = await Job.findAll(filters)

    expect(jobs).toEqual([
        {
          id: expect.any(Number),
          title: "J2",
          salary: 200,
          equity: "0.02",
          companyHandle: "c2"
        }
      ]);
  });

  test ('works: filter by hasEquity', async () => {
    let filters = {
      hasEquity: true
    }

    let jobs = await Job.findAll(filters)

    expect(jobs).toEqual([
        {
          id: expect.any(Number),
          title: "J1",
          salary: 100,
          equity: "0.01",
          companyHandle: "c1"
        },
        {
          id: expect.any(Number),
          title: "J2",
          salary: 200,
          equity: "0.02",
          companyHandle: "c2"
        }
    ]);
  });

  test('works: no filter when hasEquity = false', async () => {
    let filters = {
        hasEquity: false
    };

    let jobs = await Job.findAll(filters)

    expect(jobs).toEqual([
        {
            id: expect.any(Number),
            title: "J1",
            salary: 100,
            equity: "0.01",
            companyHandle: "c1"
          },
          {
            id: expect.any(Number),
            title: "J2",
            salary: 200,
            equity: "0.02",
            companyHandle: "c2"
          }
    ])
  })

  test('error: minSalary < 0', async () =>{
    let filters = {
      minSalary: -10
    }

    await expect(Job.findAll(filters))
    .rejects.toThrow('Min salary must be a positive number.');
  });
});

/************************************** get */

describe("get", function () {
  test("works", async function () {
    let job = await Job.get(testJobIds[0]);
    expect(job).toEqual({
        id: testJobIds[0],
        title: "J1",
        salary: 100,
        equity: "0.01",
        company: {
            handle:'c1',
            name: 'C1', 
            numEmployees: 1,
            description: 'Desc1',
            logoUrl: 'http://c1.img'
        }
      })
  });

  test("not found if no such job", async function () {
    try {
      await Job.get(1000000);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** update */

describe("update", function () {
  const updateData = {
    title: "New Title",
    salary: 10000000,
    equity: "0.1"
  };

  test("works", async function () {
    let company = await Job.update(testJobIds[0], updateData);
    expect(company).toEqual({
      id: testJobIds[0],
      ...updateData,
      companyHandle: "c1"
    });
  });

  test("works: null fields", async function () {
    const updateDataSetNulls = {
      title: "New",
      salary: null,
      equity: null,
    };

    let job = await Job.update(testJobIds[0], updateDataSetNulls);
    expect(job).toEqual({
      id: expect.any(Number),
      title: "New",
      ...updateDataSetNulls,
      companyHandle: expect.any(String)
    });

  });

  test("fails: not found if no such company", async function () {
    try {
      await Job.update(1048102, updateData);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("fails: bad request with no data", async function () {
    try {
      await Job.update(testJobIds[0], {});
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** remove */

describe("remove", function () {
  test("works", async function () {
    await Job.remove(testJobIds[0]);
    const res = await db.query(
        "SELECT id FROM jobs WHERE id=$1", [testJobIds[0]]);
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such job", async function () {
    try {
      await Job.remove(1000000);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});
