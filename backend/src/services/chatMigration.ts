import type { Knex } from 'knex'
 
export async function up(knex: Knex) {
  // One conversation = one chat thread tied to one or more books
  await knex.schema.createTable('conversations', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid())
    t.string('user_id').notNullable().index()   // Clerk userId
    t.text('book_ids').notNullable()             // comma-separated bookIds
    t.timestamp('created_at').defaultTo(knex.fn.now())
  })
 
  // Individual user/assistant turns
  await knex.schema.createTable('messages', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid())
    t.uuid('conversation_id')
      .notNullable()
      .references('id')
      .inTable('conversations')
      .onDelete('CASCADE')
    t.enum('role', ['user', 'assistant']).notNullable()
    t.text('content').notNullable()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.index(['conversation_id', 'created_at'])
  })
}
 
export async function down(knex: Knex) {
  await knex.schema.dropTableIfExists('messages')
  await knex.schema.dropTableIfExists('conversations')
}
 