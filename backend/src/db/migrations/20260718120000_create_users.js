export async function up(knex) {
  await knex.schema.createTable('users', (table) => {
    table.string('id').primary();
    table.string('google_id').notNullable().unique();
    table.string('email').notNullable();
    table.string('name').notNullable();
    table.string('picture_url');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex) {
  await knex.schema.dropTable('users');
}
