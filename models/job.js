"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");
/** Related functions for companies. */

class Job {
    /** Create a Job (from data), update db, return new job data.
     *
     * data should be { title, salary, equity, companyHandle }
     *
     * Returns { id, title, salary, equity, companyHandle }
     * */

    static async create({ title, salary, equity, companyHandle }) {
    
        const result = await db.query(
              `INSERT INTO jobs
               (title, salary, equity, company_handle)
               VALUES ($1, $2, $3, $4)
               RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
              [title, salary, equity, companyHandle]);
        const job = result.rows[0];
        return job;
      }
    
      /** Find all jobs.
       *
       * Returns [{ id, title, salary, equity, companyHandle }, ...]
       * 
       * If filter object is passed, adds WHERE expressions to filter query results.
       * Filter object only includes {title, minSalary, hasEquity}
       * */
    
    static async findAll(filters = {}){
        // basic GET all query
        let query = `SELECT id,
                        title,
                        salary,
                        equity,
                        company_handle AS "companyHandle"
                     FROM jobs`

        // arrays to hold filtering expressions & values
        const whereExpressions = [];
        const queryValues = [];

        const{ title, minSalary, hasEquity } = filters;

        // checks that minSalary > 0
        if (minSalary < 0){
            throw new BadRequestError('Min salary must be a positive number.')
        }

        // checks if filter for each category exists and collects expressions/values
        if (title){
            queryValues.push(`%${title}%`);
            whereExpressions.push(`title ILIKE $${queryValues.length}`);
        }

        if (minSalary !== undefined){
            queryValues.push(minSalary);
            whereExpressions.push(`salary >= $${queryValues.length}`);
        }

        if (hasEquity === true){
            whereExpressions.push(`equity > 0`);
        }
      
        if (whereExpressions.length > 0){
            query += ' WHERE ' + whereExpressions.join(' AND ');
        }
      
        query += ' ORDER BY title';
        const jobsRes = await db.query(query, queryValues)
        return jobsRes.rows;
    }
    
      /** Given a job id, return data about the job posting.
       *
       * Returns { id, title, salary, equity, companyHandle }
       *
       * Throws NotFoundError if not found.
       **/
    
    static async get(id) {
        const jobRes = await db.query(
              `SELECT id,
                      title,
                      salary,
                      equity,
                      company_handle AS "companyHandle"
               FROM jobs
               WHERE id = $1`, [id]);
    
        const job = jobRes.rows[0];
        
        if (!job) throw new NotFoundError(`No job with id ${id} found`);
    
        const companiesRes = await db.query(
            `SELECT handle,
                    name,
                    description,
                    num_employees AS "numEmployees",
                    logo_url AS "logoUrl"
             FROM companies
             WHERE handle = $1`, [job.companyHandle]);
  
        delete job.companyHandle;
        job.company = companiesRes.rows[0];
  
        return job;
    }
    
      /** Update job data with `data`.
       *
       * This is a "partial update" --- it's fine if data doesn't contain all the
       * fields; this only changes provided ones.
       *
       * Data can include: {title, salary, equity}
       *
       * Returns {id, title, salary, equity, companyHandle}
       *
       * Throws NotFoundError if not found.
       */
    
      static async update(id, data) {
        const { setCols, values } = sqlForPartialUpdate(
            data,
            {
              companyHandle: "company_handle"
            });
        const idVarIdx = "$" + (values.length + 1);
    
        const querySql = `UPDATE jobs 
                          SET ${setCols} 
                          WHERE id = ${idVarIdx} 
                          RETURNING id, 
                                    title, 
                                    salary, 
                                    equity, 
                                    company_handle AS "companyHandle"`;

        const result = await db.query(querySql, [...values, id]);
        const job = result.rows[0];
    
        if (!job) throw new NotFoundError(`No job with id ${id} found`);
    
        return job;
      }
    
      /** Delete given job from database; returns undefined.
       *
       * Throws NotFoundError if job not found.
       **/
    
      static async remove(id) {
        const result = await db.query(
              `DELETE
               FROM jobs
               WHERE id = $1
               RETURNING id`, [id]);
        const job = result.rows[0];
    
        if (!job) throw new NotFoundError(`No job with id ${id} found`);
      }
    }
    
    
    module.exports = Job;
    