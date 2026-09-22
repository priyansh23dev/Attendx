import { supabase } from '../config/supabase';

export const supabaseService = {
  // Auth
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  // Staff Management
  async getStaffList() {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching staff list from Supabase:', error.message);
      return [];
    }
    return data || [];
  },

  async getStaffByEmail(userEmail) {
    if (!userEmail) return null;
    const cleanEmail = userEmail.trim().toLowerCase();

    // Query staff by email or employee_id
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .or(`email.ilike.${cleanEmail},employee_id.ilike.${cleanEmail}`)
      .maybeSingle();

    if (error) {
      console.warn('Error fetching staff by email:', error.message);
      return null;
    }
    return data;
  },

  async createStaff({ name, employeeId, email, password, adminEmail }) {
    const cleanId = employeeId.trim();
    const cleanEmail = email ? email.trim().toLowerCase() : `${cleanId.toLowerCase()}@attendx.com`;
    const cleanPass = password ? password.trim() : 'Staff@123';

    // Validate uniqueness of employee_id
    const { data: existingId } = await supabase
      .from('staff')
      .select('id')
      .eq('employee_id', cleanId)
      .maybeSingle();

    if (existingId) {
      throw new Error(`Employee ID '${cleanId}' is already in use.`);
    }

    // Validate uniqueness of email
    const { data: existingEmail } = await supabase
      .from('staff')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existingEmail) {
      throw new Error(`Email '${cleanEmail}' is already registered to another staff member.`);
    }

    const { data, error } = await supabase
      .from('staff')
      .insert([
        {
          name: name.trim(),
          employee_id: cleanId,
          email: cleanEmail,
          password: cleanPass,
          admin_email: adminEmail || 'admin@attendx.com',
          face_embedding: null,
          face_image_url: null,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async authenticateUser(emailOrId, password) {
    const cleanInput = emailOrId.trim().toLowerCase();

    // Admin login check
    if (cleanInput.includes('admin')) {
      return { role: 'ADMIN', email: cleanInput, staff: null };
    }

    // Staff lookup in Supabase
    const staff = await this.getStaffByEmail(cleanInput);
    if (!staff) {
      throw new Error(`No staff member found for '${emailOrId}'. Please ask Admin to register your staff account.`);
    }

    if (staff.password && staff.password !== password.trim()) {
      throw new Error('Invalid password. Please check your password and try again.');
    }

    return { role: 'STAFF', email: staff.email || cleanInput, staff };
  },

  async updateStaffEnrollment(staffId, embedding, faceImageUrl) {
    const { data, error } = await supabase
      .from('staff')
      .update({
        face_embedding: embedding,
        face_image_url: faceImageUrl,
      })
      .eq('id', staffId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Attendance Management
  async getAttendanceHistoryForStaff(staffId) {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('staff_id', staffId)
      .order('date', { ascending: false })
      .order('time', { ascending: false });

    if (error) {
      console.warn('Error fetching attendance history:', error.message);
      return [];
    }
    return data || [];
  },

  async checkTodayAttendance(staffId, dateString) {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('staff_id', staffId)
      .eq('date', dateString)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async recordAttendance({ staffId, selfieUrl, date, time, latitude, longitude, locationAddress }) {
    // Double check duplicate attendance prevention
    const existing = await this.checkTodayAttendance(staffId, date);
    if (existing) {
      throw new Error('Attendance already marked for today.');
    }

    // Try inserting with location_address first
    const { data, error } = await supabase
      .from('attendance')
      .insert([
        {
          staff_id: staffId,
          selfie_url: selfieUrl,
          date: date,
          time: time,
          latitude: latitude,
          longitude: longitude,
          location_address: locationAddress || `GPS: (${latitude?.toFixed(4)}, ${longitude?.toFixed(4)})`,
        },
      ])
      .select()
      .single();

    if (error) {
      // If location_address column does not exist in Supabase schema cache yet, fallback to standard schema
      if (error.message && (error.message.includes('location_address') || error.code === 'PGRST204')) {
        console.warn('location_address column not found in Supabase, falling back to basic schema:', error.message);
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('attendance')
          .insert([
            {
              staff_id: staffId,
              selfie_url: selfieUrl,
              date: date,
              time: time,
              latitude: latitude,
              longitude: longitude,
            },
          ])
          .select()
          .single();

        if (fallbackError) throw fallbackError;
        return fallbackData;
      }
      throw error;
    }

    return data;
  },

  // Storage Upload
  async uploadSelfieImage(localPath, staffId) {
    try {
      const timestamp = new Date().getTime();
      const fileName = `attendance/${staffId}/${timestamp}.jpg`;
      const formattedUri = localPath.startsWith('file://') || localPath.startsWith('content://')
        ? localPath
        : `file://${localPath}`;

      const formData = new FormData();
      formData.append('file', {
        uri: formattedUri,
        name: `${timestamp}.jpg`,
        type: 'image/jpeg',
      });

      const { data, error } = await supabase.storage
        .from('attendance-selfies')
        .upload(fileName, formData, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) {
        console.warn('Storage upload warning:', error.message);
        return formattedUri;
      }

      const { data: publicUrlData } = supabase.storage
        .from('attendance-selfies')
        .getPublicUrl(fileName);

      return publicUrlData.publicUrl;
    } catch (err) {
      console.warn('Upload image exception:', err.message);
      return localPath;
    }
  },

  async uploadEnrollmentImage(localPath, staffId) {
    try {
      const fileName = `enrollment/${staffId}.jpg`;
      const formattedUri = localPath.startsWith('file://') || localPath.startsWith('content://')
        ? localPath
        : `file://${localPath}`;

      const formData = new FormData();
      formData.append('file', {
        uri: formattedUri,
        name: `enrollment_${staffId}.jpg`,
        type: 'image/jpeg',
      });

      const { data, error } = await supabase.storage
        .from('attendance-selfies')
        .upload(fileName, formData, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) {
        return formattedUri;
      }

      const { data: publicUrlData } = supabase.storage
        .from('attendance-selfies')
        .getPublicUrl(fileName);

      return publicUrlData.publicUrl;
    } catch (err) {
      return localPath;
    }
  },
};
