"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token, adminToken, testJobIds
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

async function getId(){
    let jobIdQuery = await db.query(`SELECT id 
                                    FROM jobs
                                    WHERE title = 'J1'`)

    // console.log (jobIdQuery.rows[0])
    return (jobIdQuery.rows[0].id)
}

/************************************** POST /jobs */

describe("POST /jobs", function () {
    const newJob = {
      title: "new",
      salary: 40000,
      equity: "0.089",
      companyHandle: "c1"
    };
  
    test("ok for admin users", async function () {
      const resp = await request(app)
          .post("/jobs")
          .send(newJob)
          .set("authorization", `Bearer ${adminToken}`);
      expect(resp.statusCode).toEqual(201);
      expect(resp.body).toEqual({
        job:{
            id: expect.any(Number),
            title: "new",
            salary: 40000,
            equity: "0.089",
            companyHandle: "c1"
            }
      });
    });
  
    test("bad request with missing required data - companyHandle", async function () {
      const resp = await request(app)
          .post("/jobs")
          .send({
            title: "new"
          })
          .set("authorization", `Bearer ${adminToken}`);
      expect(resp.statusCode).toEqual(400);
    });
  
    test("bad request with invalid data form - salary a string", async function () {
      const resp = await request(app)
          .post("/jobs")
          .send({
            title: "new",
            salary: "40000",
            equity: "0.089",
            companyHandle: "c1"
          })
          .set("authorization", `Bearer ${adminToken}`);
      expect(resp.statusCode).toEqual(400);
    });
  
    test('fails: unauthorized user', async () => {
      const resp = await request(app)
      .post("/jobs")
      .send(newJob)
      .set("authorizaton", `Bearer ${u1Token}`);
  
      expect(resp.statusCode).toEqual(401)
    })
});

/************************************** GET /jobs */

describe("GET /jobs", function () {
    test("ok for anon", async function () {
      const resp = await request(app).get("/jobs");
      expect(resp.body).toEqual({
        jobs:
            [
              {
                id: expect.any(Number),
                title: "J1",
                salary: 45000,
                equity: "0",
                companyHandle: "c1"
              },
              {
                id: expect.any(Number),
                title: "J2",
                salary: 60000,
                equity: "0.0164",
                companyHandle: "c2"
              }
            ]
      });
    });
  
    test('works: with filters', async () => {
      const filters = {
        title: 'j',
        minSalary: 50000,
        hasEquity: 'true'
      }
      const resp = await request(app).get("/jobs").query(filters)
      expect(resp.statusCode).toEqual(200);
      expect(resp.body).toEqual({
        jobs: [
            {
                id: expect.any(Number),
                title: "J2",
                salary: 60000,
                equity: "0.0164",
                companyHandle: "c2"
              }
        ]
      })
    });
  
    test('fails: filter data validation check failure', async () => {
      const filters = {
        title: 'j',
        minSalary: 'notNumber'
      }
      const resp = await request(app).get("/jobs").query(filters)
      expect(resp.statusCode).toEqual(400);
    });

    test('fails: bad request on invalid filter key', async () => {
       const filters = {
        minSalary: 40000,
        invalid: "invalid"
       }
       
       const resp = await request(app).get("/jobs").query(filters)
       expect(resp.statusCode).toEqual(400);
    })
  
    test("fails: test next() handler", async function () {
      // there's no normal failure event which will cause this route to fail ---
      // thus making it hard to test that the error-handler works with it. This
      // should cause an error, all right :)
      await db.query("DROP TABLE jobs CASCADE");
      const resp = await request(app)
          .get("/jobs")
          .set("authorization", `Bearer ${u1Token}`);
      expect(resp.statusCode).toEqual(500);
    });
  });

/************************************** GET /jobs/:id */

describe("GET /jobs/:id", function () {
    test("works for anon", async function () {
      const resp = await request(app).get(`/jobs/${testJobIds[0]}`);
      expect(resp.body).toEqual({
        job: {
            id: expect.any(Number),
            title: "J1",
            salary: 45000,
            equity: "0",
            company:{
                        handle: "c1",
                        name: "C1",
                        description: "Desc1",
                        numEmployees: 1,
                        logoUrl: "http://c1.img",
                    }
        }
      });
    });
  
    test("not found for job that doesn't exist", async function () {
      const resp = await request(app).get(`/jobs/${212341023}`);
      expect(resp.statusCode).toEqual(404);
    });
  });

  /************************************** PATCH /jobs/:id */

describe("PATCH /jobs/:id", function () {
    test("works for admin users", async function () {
      const resp = await request(app)
          .patch(`/jobs/${testJobIds[0]}`)
          .send({
            title: "New J1",
            salary: 500
          })
          .set("authorization", `Bearer ${adminToken}`);
      expect(resp.body).toEqual({
        job: {
          id: expect.any(Number),
          title: "New J1",
          salary: 500,
          equity: "0",
          companyHandle: "c1",
        },
      });
    });
  
    test("fails: unauth for non-admin user", async () => {
      const resp = await request(app)
          .patch(`/jobs/${testJobIds[0]}`)
          .send({
            title: "New J1"
          })
          .set("authorization", `Bearer ${u1Token}`);
   
      expect(resp.statusCode).toEqual(401);
    });
  
    test("fails: unauth for anon", async function () {
      const resp = await request(app)
          .patch(`/jobs/${testJobIds[0]}`)
          .send({
            title: "New J1"
          });
      expect(resp.statusCode).toEqual(401);
    });
  
    test("not found on no such job", async function () {
      const resp = await request(app)
          .patch(`/jobs/0`)
          .send({
            title: "New J1"
          })
          .set("authorization", `Bearer ${adminToken}`);
      expect(resp.statusCode).toEqual(404);
    });
  
    test("bad request on company handle change attempt", async function () {
        const resp = await request(app)
          .patch(`/jobs/${testJobIds[0]}`)
          .send({
            companyHandle: "c1-new",
          })
          .set("authorization", `Bearer ${adminToken}`);
      expect(resp.statusCode).toEqual(400);
    });
  
    test("bad request on invalid data", async function () {
      const resp = await request(app)
          .patch(`/jobs/${testJobIds[1]}`)
          .send({
            salary: "not an integer",
          })
          .set("authorization", `Bearer ${adminToken}`);
      expect(resp.statusCode).toEqual(400);
    });
  });

  /************************************** DELETE /jobs/:id */

describe("DELETE /jobs/:id", function () {
    test("works for admin users", async function () {
      const resp = await request(app)
          .delete(`/jobs/${testJobIds[0]}`)
          .set("authorization", `Bearer ${adminToken}`);
      expect(resp.body).toEqual({ deleted: testJobIds[0] });
    });
  
    test("unauth for non-admin users", async function () {
      const resp = await request(app)
          .delete(`/jobs/${testJobIds[1]}`)
          .set("authorization", `Bearer ${u1Token}`);
      expect(resp.statusCode).toEqual(401);
    });
  
    test("unauth for anon", async function () {
      const resp = await request(app)
          .delete(`/jobs/${testJobIds[1]}`);
      expect(resp.statusCode).toEqual(401);
    });
  
    test("not found for no such job", async function () {
      const resp = await request(app)
          .delete(`/jobs/0`)
          .set("authorization", `Bearer ${adminToken}`);
      expect(resp.statusCode).toEqual(404);
    });
  });
  