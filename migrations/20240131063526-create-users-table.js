'use strict';

var dbm;
var type;
var seed;

/**
 * We receive the dbmigrate dependency from dbmigrate initially.
 * This enables us to not have to rely on NODE_PATH.
 */
exports.setup = function (options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function (db, callback) {
  db.createTable(
    'users',
    {
      id: { type: 'int', primaryKey: true, autoIncrement: true },
      nama: { type: 'string', notNull: true },
      password: { type: 'string', notNull: true },
      email: { type: 'string', unique: true, notNull: true },
      jenis: { type: 'string', notNull: true },
      jabatan: { type: 'string', notNull: true },
      password_reset_token: { type: 'string', unique: true, allowNull: true },
      password_reset_at: { type: 'datetime', allowNull: true },
    },
    callback
  );
};

exports.down = function (db, callback) {
  db.dropTable('users', callback);
};

exports._meta = {
  version: 1,
};
