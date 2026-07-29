const db = require('../db');

/**
 * Get fulfillment status of all posts
 */
async function getFulfillmentStatus(req, res) {
  try {
    // Get all posts and count how many active guards are assigned to each
    const result = await db.query(`
      SELECT 
        p.id AS post_id, 
        p.name AS post_name, 
        p.address,
        p.required_guards,
        COUNT(g.id) AS assigned_guards
      FROM posts p
      LEFT JOIN guards g ON p.id = g.assigned_post_id AND g.status = 'ACTIVE'
      WHERE p.status = 'ACTIVE'
      GROUP BY p.id, p.name, p.address, p.required_guards
      ORDER BY p.name ASC
    `);

    // Calculate understaffed/overstaffed status
    const posts = result.rows.map(post => {
      const assigned = parseInt(post.assigned_guards, 10);
      const required = parseInt(post.required_guards, 10);
      let status = 'FULFILLED';
      if (assigned < required) status = 'UNDERSTAFFED';
      else if (assigned > required) status = 'OVERSTAFFED';

      return {
        ...post,
        assigned_guards: assigned,
        required_guards: required,
        fulfillment_status: status,
        shortage: required > assigned ? required - assigned : 0
      };
    });

    // Also get counts for summary
    const unassignedGuards = await db.query(`
      SELECT COUNT(id) AS count FROM guards 
      WHERE status = 'ACTIVE' AND assigned_post_id IS NULL
    `);

    return res.json({
      success: true,
      data: {
        posts,
        summary: {
          total_posts: posts.length,
          understaffed_posts: posts.filter(p => p.fulfillment_status === 'UNDERSTAFFED').length,
          unassigned_guards_available: parseInt(unassignedGuards.rows[0].count, 10)
        }
      }
    });
  } catch (err) {
    console.error('Error fetching fulfillment status:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

/**
 * Generate intelligent guard assignment suggestions
 */
async function getSuggestions(req, res) {
  try {
    // 1. Get understaffed posts
    const postsRes = await db.query(`
      SELECT 
        p.id AS post_id, 
        p.name AS post_name, 
        p.required_guards,
        COUNT(g.id) AS assigned_guards
      FROM posts p
      LEFT JOIN guards g ON p.id = g.assigned_post_id AND g.status = 'ACTIVE'
      WHERE p.status = 'ACTIVE'
      GROUP BY p.id, p.name, p.required_guards
      HAVING COUNT(g.id) < p.required_guards
      ORDER BY (p.required_guards - COUNT(g.id)) DESC
    `);

    // 2. Get unassigned guards
    const guardsRes = await db.query(`
      SELECT id, name, mobile 
      FROM guards 
      WHERE status = 'ACTIVE' AND assigned_post_id IS NULL
      ORDER BY name ASC
    `);

    let availableGuards = [...guardsRes.rows];
    const suggestions = [];

    // 3. Simple matching algorithm
    for (const post of postsRes.rows) {
      const required = parseInt(post.required_guards, 10);
      let assigned = parseInt(post.assigned_guards, 10);
      
      while (assigned < required && availableGuards.length > 0) {
        // Pick the first available guard
        const guardToAssign = availableGuards.shift();
        
        suggestions.push({
          guard_id: guardToAssign.id,
          guard_name: guardToAssign.name,
          guard_mobile: guardToAssign.mobile,
          post_id: post.post_id,
          post_name: post.post_name
        });
        
        assigned++;
      }
    }

    return res.json({
      success: true,
      data: {
        suggestions,
        remaining_unassigned_guards: availableGuards.length,
        remaining_unfulfilled_posts: postsRes.rows.filter(p => {
          const matched = suggestions.filter(s => s.post_id === p.post_id).length;
          return parseInt(p.assigned_guards, 10) + matched < parseInt(p.required_guards, 10);
        }).length
      }
    });
  } catch (err) {
    console.error('Error generating suggestions:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

/**
 * Apply a batch of suggestions (assign guards to posts)
 */
async function applySuggestions(req, res) {
  const client = await db.getClient();
  try {
    const { assignments } = req.body;
    
    if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({ success: false, message: 'No assignments provided.' });
    }

    await client.query('BEGIN');

    for (const assignment of assignments) {
      const { guard_id, post_id } = assignment;
      if (guard_id && post_id) {
        await client.query(
          `UPDATE guards SET assigned_post_id = $1 WHERE id = $2`,
          [post_id, guard_id]
        );
      }
    }

    await client.query('COMMIT');
    return res.json({ success: true, message: 'Roster suggestions applied successfully.' });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('Error applying suggestions:', err);
    return res.status(500).json({ success: false, message: 'Server error applying suggestions' });
  }
}

module.exports = {
  getFulfillmentStatus,
  getSuggestions,
  applySuggestions
};
