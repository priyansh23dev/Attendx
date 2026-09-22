
CREATE TABLE IF NOT EXISTS public.staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    employee_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL DEFAULT 'Staff@123',
    admin_email TEXT NOT NULL DEFAULT 'admin@attendx.com',
    face_embedding JSONB,
    face_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- If staff table already exists without email/password/admin_email columns, add them:
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS password TEXT NOT NULL DEFAULT 'Staff@123';
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS admin_email TEXT NOT NULL DEFAULT 'admin@attendx.com';

-- 2. Create Attendance Table (Enforcing unique (staff_id, date) per staff member)
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    selfie_url TEXT,
    date DATE NOT NULL,
    time TIME NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_staff_attendance_per_day UNIQUE (staff_id, date)
);

-- If attendance table already exists without location_address column, add it:
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS location_address TEXT;


-- 3. Create Performance Indexes
CREATE INDEX IF NOT EXISTS idx_staff_employee_id ON public.staff(employee_id);
CREATE INDEX IF NOT EXISTS idx_staff_email ON public.staff(email);
CREATE INDEX IF NOT EXISTS idx_staff_admin_email ON public.staff(admin_email);
CREATE INDEX IF NOT EXISTS idx_attendance_staff_date ON public.attendance(staff_id, date);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Staff Table
DROP POLICY IF EXISTS "Allow public select on staff" ON public.staff;
DROP POLICY IF EXISTS "Allow public insert on staff" ON public.staff;
DROP POLICY IF EXISTS "Allow public update on staff" ON public.staff;

CREATE POLICY "Allow public select on staff" ON public.staff FOR SELECT USING (true);
CREATE POLICY "Allow public insert on staff" ON public.staff FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on staff" ON public.staff FOR UPDATE USING (true);

-- RLS Policies for Attendance Table
DROP POLICY IF EXISTS "Allow public select on attendance" ON public.attendance;
DROP POLICY IF EXISTS "Allow public insert on attendance" ON public.attendance;

CREATE POLICY "Allow public select on attendance" ON public.attendance FOR SELECT USING (true);
CREATE POLICY "Allow public insert on attendance" ON public.attendance FOR INSERT WITH CHECK (true);

-- 5. Create Storage Bucket for Selfies & Face Enrollment Photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('attendance-selfies', 'attendance-selfies', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
DROP POLICY IF EXISTS "Public Storage Select" ON storage.objects;
DROP POLICY IF EXISTS "Public Storage Insert" ON storage.objects;
DROP POLICY IF EXISTS "Public Storage Update" ON storage.objects;

CREATE POLICY "Public Storage Select" ON storage.objects FOR SELECT USING (bucket_id = 'attendance-selfies');
CREATE POLICY "Public Storage Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'attendance-selfies');
CREATE POLICY "Public Storage Update" ON storage.objects FOR UPDATE USING (bucket_id = 'attendance-selfies');

-- ========================================================
-- 6. Insert 2 Dummy Staff Members Linked to Admin
-- ========================================================
INSERT INTO public.staff (name, employee_id, email, password, admin_email)
VALUES 
    ('John Doe', 'EMP001', 'john@attendx.com', 'Staff@123', 'admin@attendx.com'),
    ('Sarah Connor', 'EMP002', 'sarah@attendx.com', 'Staff@123', 'admin@attendx.com')
ON CONFLICT (employee_id) DO UPDATE SET 
    email = EXCLUDED.email,
    password = EXCLUDED.password,
    admin_email = EXCLUDED.admin_email;
