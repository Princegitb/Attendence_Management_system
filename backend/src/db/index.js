const { Pool } = require('pg');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

let pool = null;
let useInMemoryDb = false;

// In-Memory storage fallback if PostgreSQL service is offline
const inMemoryTables = {
  managers: [],
  field_officers: [],
  posts: [],
  shifts: [],
  guards: [],
  officer_assignments: [],
  attendance: [],
  audit_logs: []
};

let autoIncrementIds = {
  managers: 1,
  field_officers: 1,
  posts: 1,
  shifts: 1,
  guards: 1,
  officer_assignments: 1,
  attendance: 1,
  audit_logs: 1
};

try {
  const isCloudDb = process.env.DATABASE_URL || (process.env.PGHOST && !process.env.PGHOST.includes('localhost') && !process.env.PGHOST.includes('127.0.0.1'));

  if (process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 10000,
      ssl: { rejectUnauthorized: false }
    });
  } else {
    pool = new Pool({
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT || '5432'),
      database: process.env.PGDATABASE || 'guard_attendance_db',
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres',
      connectionTimeoutMillis: 10000,
      ...(isCloudDb ? { ssl: { rejectUnauthorized: false } } : {})
    });
  }

  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client:', err.message);
  });
} catch (e) {
  console.warn('PostgreSQL client init failed, switching to in-memory db fallback:', e.message);
  useInMemoryDb = true;
}

// Unified query wrapper
async function query(text, params = []) {
  if (pool && !useInMemoryDb) {
    try {
      const res = await pool.query(text, params);
      return res;
    } catch (error) {
      const isConnectionError = error.code === 'ECONNREFUSED' ||
                                 error.code === 'ENOTFOUND' ||
                                 error.code === 'ETIMEDOUT' ||
                                 error.code === 'ENETUNREACH' ||
                                 error.code === 'EHOSTUNREACH' ||
                                 error.message.includes('connect ECONNREFUSED') ||
                                 error.message.includes('ENOTFOUND') ||
                                 error.message.includes('timeout');
      if (isConnectionError) {
        console.warn(`PostgreSQL connection failed (${error.message}). Operating in dev mode with mock DB fallback.`);
        useInMemoryDb = true;
        return simulateQuery(text, params);
      }
      throw error;
    }
  } else {
    return simulateQuery(text, params);
  }
}

// Lightweight SQL simulator for dev testing when PostgreSQL is not running locally
function simulateQuery(text, params) {
  const sql = text.trim();
  const lowerSql = sql.toLowerCase();

  // Handle SELECT
  if (lowerSql.startsWith('select')) {
    if (lowerSql.includes('from managers')) {
      let res = [...inMemoryTables.managers];
      if (lowerSql.includes('where mobile = $1')) {
        res = res.filter(m => String(m.mobile).trim() === String(params[0]).trim());
      }
      return { rows: res, rowCount: res.length };
    }

    if (lowerSql.includes('from field_officers')) {
      let res = [...inMemoryTables.field_officers];
      if (lowerSql.includes('where mobile = $1')) {
        res = res.filter(o => String(o.mobile).trim() === String(params[0]).trim());
      } else if (lowerSql.includes('where id = $1')) {
        res = res.filter(o => String(o.id) === String(params[0]));
      }
      return { rows: res, rowCount: res.length };
    }

    if (lowerSql.includes('from posts')) {
      let res = [...inMemoryTables.posts];
      if (lowerSql.includes('where id = $1')) {
        res = res.filter(p => String(p.id) === String(params[0]));
      } else if (lowerSql.includes('where lower(name) = lower($1)')) {
        res = res.filter(p => (p.name || '').toLowerCase() === (params[0] || '').toLowerCase());
      }
      return { rows: res, rowCount: res.length };
    }

    if (lowerSql.includes('from shifts')) {
      let res = [...inMemoryTables.shifts];
      if (lowerSql.includes('where id = $1')) {
        res = res.filter(s => String(s.id) === String(params[0]));
      } else if (lowerSql.includes('where lower(name) = lower($1)')) {
        res = res.filter(s => (s.name || '').toLowerCase() === (params[0] || '').toLowerCase());
      }
      return { rows: res, rowCount: res.length };
    }

    if (lowerSql.includes('from guards g') || lowerSql.includes('join officer_assignments')) {
      const officerId = params[0];
      const today = params[1] || new Date().toISOString().split('T')[0];

      const rows = inMemoryTables.guards.map(g => {
        const post = inMemoryTables.posts.find(p => String(p.id) === String(g.assigned_post_id)) || {
          id: 1,
          name: 'Main Gate - HQ',
          address: 'CBD Area',
          latitude: 28.613939,
          longitude: 77.209021,
          allowed_radius_metres: 100
        };

        const shift = inMemoryTables.shifts.find(s => String(s.id) === String(g.assigned_shift_id)) || {
          id: 1,
          name: 'Day Shift',
          start_time: '08:00:00',
          end_time: '16:00:00'
        };

        const att = inMemoryTables.attendance.find(a => String(a.guard_id) === String(g.id) && a.date === today);

        return {
          guard_id: g.id,
          guard_name: g.name,
          guard_mobile: g.mobile,
          guard_status: g.status,
          post_id: post.id,
          post_name: post.name,
          post_address: post.address,
          post_latitude: post.latitude,
          post_longitude: post.longitude,
          allowed_radius_metres: post.allowed_radius_metres,
          shift_id: shift.id,
          shift_name: shift.name,
          start_time: shift.start_time,
          end_time: shift.end_time,
          attendance_id: att ? att.id : null,
          check_in_time: att ? att.check_in_time : null,
          check_in_photo_url: att ? att.check_in_photo_url : null,
          check_in_distance_from_post: att ? att.check_in_distance_from_post : null,
          check_out_time: att ? att.check_out_time : null,
          check_out_photo_url: att ? att.check_out_photo_url : null,
          attendance_status: att ? att.status : 'PENDING'
        };
      });

      return { rows, rowCount: rows.length };
    }

    if (lowerSql.includes('from guards')) {
      let res = inMemoryTables.guards.map(g => {
        const post = inMemoryTables.posts.find(p => String(p.id) === String(g.assigned_post_id)) || inMemoryTables.posts[0] || {
          id: 1, name: 'Main Gate - HQ', latitude: 28.613939, longitude: 77.209021, allowed_radius_metres: 100
        };
        const shift = inMemoryTables.shifts.find(s => String(s.id) === String(g.assigned_shift_id)) || inMemoryTables.shifts[0] || {
          id: 1, name: 'Day Shift', start_time: '08:00:00', end_time: '16:00:00', grace_period_minutes: 15
        };
        return {
          ...g,
          post_id: post ? post.id : 1,
          post_name: post ? post.name : 'Unassigned',
          post_lat: post ? post.latitude : 28.613939,
          post_lon: post ? post.longitude : 77.209021,
          post_latitude: post ? post.latitude : 28.613939,
          post_longitude: post ? post.longitude : 77.209021,
          allowed_radius_metres: post ? post.allowed_radius_metres : 100,
          shift_id: shift ? shift.id : 1,
          shift_name: shift ? shift.name : 'Unassigned',
          start_time: shift ? shift.start_time : '08:00:00',
          end_time: shift ? shift.end_time : '16:00:00',
          grace_period_minutes: shift ? shift.grace_period_minutes : 15
        };
      });
      if (lowerSql.includes('where g.id = $1') || lowerSql.includes('where id = $1')) {
        res = res.filter(g => String(g.id) === String(params[0]));
      }
      return { rows: res, rowCount: res.length };
    }

    if (lowerSql.includes('from officer_assignments')) {
      let res = inMemoryTables.officer_assignments.map(oa => {
        const officer = inMemoryTables.field_officers.find(o => String(o.id) === String(oa.officer_id));
        const guard = inMemoryTables.guards.find(g => String(g.id) === String(oa.guard_id));
        const post = inMemoryTables.posts.find(p => String(p.id) === String(oa.post_id));
        return {
          ...oa,
          officer_name: officer ? officer.name : 'Officer',
          officer_mobile: officer ? officer.mobile : '',
          guard_name: guard ? guard.name : null,
          post_name: post ? post.name : null
        };
      });
      if (lowerSql.includes('where officer_id = $1')) {
        res = res.filter(a => String(a.officer_id) === String(params[0]));
      }
      return { rows: res, rowCount: res.length };
    }

    if (lowerSql.includes('from attendance')) {
      let res = inMemoryTables.attendance.map(a => {
        const guard = inMemoryTables.guards.find(g => String(g.id) === String(a.guard_id));
        const post = inMemoryTables.posts.find(p => String(p.id) === String(g?.assigned_post_id));
        const shift = inMemoryTables.shifts.find(s => String(s.id) === String(g?.assigned_shift_id)) || inMemoryTables.shifts[0];
        const officer = inMemoryTables.field_officers.find(o => String(o.id) === String(a.marked_by_officer_id));
        return {
          ...a,
          guard_name: guard ? guard.name : 'Guard',
          guard_mobile: guard ? guard.mobile : '',
          post_name: post ? post.name : 'Post',
          marked_by_officer: officer ? officer.name : 'Officer',
          shift_name: shift ? shift.name : 'Shift',
          shift_start_time: shift ? shift.start_time : '08:00:00',
          shift_end_time: shift ? shift.end_time : '16:00:00'
        };
      });

      if (lowerSql.includes('where guard_id = $1 and date = $2')) {
        res = res.filter(a => String(a.guard_id) === String(params[0]) && a.date === params[1]);
      } else if (lowerSql.includes('where a.date = $1') || lowerSql.includes('where date = $1')) {
        res = res.filter(a => a.date === params[0]);
      } else if (lowerSql.includes('where id = $1')) {
        res = res.filter(a => String(a.id) === String(params[0]));
      }
      return { rows: res, rowCount: res.length };
    }

    if (lowerSql.includes('from audit_logs')) {
      return { rows: [...inMemoryTables.audit_logs], rowCount: inMemoryTables.audit_logs.length };
    }
  }

  // Handle INSERT
  if (lowerSql.startsWith('insert into')) {
    if (lowerSql.includes('managers')) {
      const existingIdx = inMemoryTables.managers.findIndex(m => String(m.mobile).trim() === String(params[1]).trim());
      const newObj = {
        id: existingIdx >= 0 ? inMemoryTables.managers[existingIdx].id : autoIncrementIds.managers++,
        name: params[0],
        mobile: String(params[1]).trim(),
        password_hash: params[2],
        role: params[3] || 'MANAGER',
        created_at: new Date()
      };
      if (existingIdx >= 0) {
        inMemoryTables.managers[existingIdx] = newObj;
      } else {
        inMemoryTables.managers.push(newObj);
      }
      return { rows: [newObj], rowCount: 1 };
    }

    if (lowerSql.includes('field_officers')) {
      const existingIdx = inMemoryTables.field_officers.findIndex(o => String(o.mobile).trim() === String(params[1]).trim());
      const newObj = {
        id: existingIdx >= 0 ? inMemoryTables.field_officers[existingIdx].id : autoIncrementIds.field_officers++,
        name: params[0],
        mobile: String(params[1]).trim(),
        password_hash: params[2],
        must_change_password: params[3] !== undefined ? params[3] : true,
        status: params[4] || 'ACTIVE',
        created_at: new Date()
      };
      if (existingIdx >= 0) {
        inMemoryTables.field_officers[existingIdx] = newObj;
      } else {
        inMemoryTables.field_officers.push(newObj);
      }
      return { rows: [newObj], rowCount: 1 };
    }

    if (lowerSql.includes('posts')) {
      const newObj = {
        id: autoIncrementIds.posts++,
        name: params[0],
        address: params[1],
        latitude: params[2],
        longitude: params[3],
        allowed_radius_metres: params[4] || 100,
        status: params[5] || 'ACTIVE',
        created_at: new Date()
      };
      inMemoryTables.posts.push(newObj);
      return { rows: [newObj], rowCount: 1 };
    }

    if (lowerSql.includes('shifts')) {
      const newObj = {
        id: autoIncrementIds.shifts++,
        name: params[0],
        start_time: params[1],
        end_time: params[2],
        grace_period_minutes: params[3] || 15,
        created_at: new Date()
      };
      inMemoryTables.shifts.push(newObj);
      return { rows: [newObj], rowCount: 1 };
    }

    if (lowerSql.includes('guards')) {
      const newObj = {
        id: autoIncrementIds.guards++,
        name: params[0],
        mobile: params[1],
        assigned_post_id: params[2],
        assigned_shift_id: params[3],
        date_of_joining: params[4] || new Date().toISOString().split('T')[0],
        status: params[5] || 'ACTIVE',
        created_at: new Date()
      };
      inMemoryTables.guards.push(newObj);
      return { rows: [newObj], rowCount: 1 };
    }

    if (lowerSql.includes('officer_assignments')) {
      const newObj = {
        id: autoIncrementIds.officer_assignments++,
        officer_id: params[0],
        guard_id: params[1],
        post_id: params[2],
        from_date: params[3],
        to_date: params[4],
        created_by: params[5],
        created_at: new Date()
      };
      inMemoryTables.officer_assignments.push(newObj);
      return { rows: [newObj], rowCount: 1 };
    }

    if (lowerSql.includes('attendance')) {
      const newObj = {
        id: autoIncrementIds.attendance++,
        guard_id: params[0],
        marked_by_officer_id: params[1],
        date: params[2],
        check_in_time: params[3],
        check_in_latitude: params[4],
        check_in_longitude: params[5],
        check_in_gps_accuracy: params[6],
        check_in_distance_from_post: params[7],
        check_in_photo_url: params[8],
        post_id_snapshot: params[9],
        radius_snapshot: params[10],
        status: params[11] || 'CHECKED_IN',
        created_at: new Date()
      };
      inMemoryTables.attendance.push(newObj);
      return { rows: [newObj], rowCount: 1 };
    }

    if (lowerSql.includes('audit_logs')) {
      const newObj = {
        id: autoIncrementIds.audit_logs++,
        action: params[0],
        performed_by: params[1],
        performed_by_role: params[2],
        target_type: params[3],
        target_id: params[4],
        old_value: params[5],
        new_value: params[6],
        reason: params[7],
        timestamp: new Date()
      };
      inMemoryTables.audit_logs.push(newObj);
      return { rows: [newObj], rowCount: 1 };
    }
  }

  // Handle UPDATE
  if (lowerSql.startsWith('update')) {
    if (lowerSql.includes('field_officers')) {
      if (lowerSql.includes('must_change_password')) {
        const item = inMemoryTables.field_officers.find(o => String(o.id) === String(params[1]));
        if (item) {
          item.password_hash = params[0];
          item.must_change_password = false;
          return { rows: [item], rowCount: 1 };
        }
      }
    }
    if (lowerSql.includes('attendance')) {
      const item = inMemoryTables.attendance.find(a => String(a.id) === String(params[params.length - 1]));
      if (item) {
        if (lowerSql.includes('check_out_time')) {
          item.check_out_time = params[0];
          item.check_out_latitude = params[1];
          item.check_out_longitude = params[2];
          item.check_out_photo_url = params[3];
          item.status = 'CHECKED_OUT';
        } else if (lowerSql.includes('status =')) {
          item.status = params[0];
        }
        return { rows: [item], rowCount: 1 };
      }
    }
  }

  // Handle DELETE
  if (lowerSql.startsWith('delete from')) {
    if (lowerSql.includes('officer_assignments')) {
      const initialLen = inMemoryTables.officer_assignments.length;
      inMemoryTables.officer_assignments = inMemoryTables.officer_assignments.filter(oa => String(oa.id) !== String(params[0]));
      const deletedCount = initialLen - inMemoryTables.officer_assignments.length;
      return { rows: [], rowCount: deletedCount };
    }
    if (lowerSql.includes('guards')) {
      const initialLen = inMemoryTables.guards.length;
      inMemoryTables.guards = inMemoryTables.guards.filter(g => String(g.id) !== String(params[0]));
      const deletedCount = initialLen - inMemoryTables.guards.length;
      return { rows: [], rowCount: deletedCount };
    }
    if (lowerSql.includes('field_officers')) {
      const initialLen = inMemoryTables.field_officers.length;
      inMemoryTables.field_officers = inMemoryTables.field_officers.filter(o => String(o.id) !== String(params[0]));
      const deletedCount = initialLen - inMemoryTables.field_officers.length;
      return { rows: [], rowCount: deletedCount };
    }
  }

  return { rows: [], rowCount: 0 };
}

// Transaction client helper
async function getClient() {
  if (pool && !useInMemoryDb) {
    try {
      const client = await pool.connect();
      return client;
    } catch (err) {
      console.warn(`PostgreSQL getClient failed (${err.message}). Operating in dev mode with mock DB fallback.`);
      useInMemoryDb = true;
      return {
        query: simulateQuery,
        release: () => {}
      };
    }
  }
  return {
    query: simulateQuery,
    release: () => {}
  };
}

module.exports = {
  query,
  getClient,
  get isInMemory() { return useInMemoryDb; },
  inMemoryTables
};
