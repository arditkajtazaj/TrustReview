-- Location: supabase/migrations/20250827213445_trust_review_system.sql
-- Schema Analysis: No existing schema - fresh project implementation
-- Integration Type: Complete trust review system with auth, analytics, and file storage
-- Dependencies: Authentication system with user profiles, product scanning, review analysis

-- 1. Types and Enums
CREATE TYPE public.user_role AS ENUM ('consumer', 'business', 'admin');
CREATE TYPE public.subscription_tier AS ENUM ('free', 'premium', 'enterprise');
CREATE TYPE public.platform_type AS ENUM ('amazon', 'yelp', 'google-maps', 'shopify', 'etsy');
CREATE TYPE public.scan_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE public.confidence_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE public.analysis_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- 2. Core Tables - User Management
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role public.user_role DEFAULT 'consumer'::public.user_role,
    subscription_tier public.subscription_tier DEFAULT 'free'::public.subscription_tier,
    company_name TEXT,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Product and Platform Tables
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    platform public.platform_type NOT NULL,
    product_name TEXT NOT NULL,
    product_url TEXT,
    product_image_url TEXT,
    category TEXT,
    brand TEXT,
    asin TEXT, -- Amazon Standard Identification Number
    sku TEXT,
    price DECIMAL(10,2),
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Scan History and Analysis Tables  
CREATE TABLE public.product_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    platform public.platform_type NOT NULL,
    scan_status public.scan_status DEFAULT 'pending'::public.scan_status,
    trust_score INTEGER CHECK (trust_score >= 0 AND trust_score <= 100),
    confidence public.confidence_level DEFAULT 'medium'::public.confidence_level,
    reviews_analyzed INTEGER DEFAULT 0,
    authentic_percentage DECIMAL(5,2),
    suspicious_percentage DECIMAL(5,2),
    flagged_reviews INTEGER DEFAULT 0,
    review_quality_score INTEGER CHECK (review_quality_score >= 0 AND review_quality_score <= 100),
    reviewer_history_score INTEGER CHECK (reviewer_history_score >= 0 AND reviewer_history_score <= 100),
    pattern_score INTEGER CHECK (pattern_score >= 0 AND pattern_score <= 100),
    warnings TEXT[],
    scan_duration INTEGER, -- in seconds
    scanned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Reviews and Analysis Tables
CREATE TABLE public.review_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID REFERENCES public.product_scans(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    reviewer_name TEXT,
    reviewer_id TEXT,
    review_content TEXT NOT NULL,
    review_rating INTEGER CHECK (review_rating >= 1 AND review_rating <= 5),
    review_date TIMESTAMPTZ,
    authenticity_score DECIMAL(5,2),
    is_suspicious BOOLEAN DEFAULT false,
    suspicious_patterns TEXT[],
    language_analysis JSONB DEFAULT '{}',
    reviewer_profile_analysis JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Business Analytics Tables
CREATE TABLE public.business_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    upload_status public.analysis_status DEFAULT 'pending'::public.analysis_status,
    reviews_count INTEGER DEFAULT 0,
    processing_started_at TIMESTAMPTZ,
    processing_completed_at TIMESTAMPTZ,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. Analytics and Statistics Tables
CREATE TABLE public.user_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    total_scans INTEGER DEFAULT 0,
    scans_this_month INTEGER DEFAULT 0,
    average_trust_score DECIMAL(5,2) DEFAULT 0,
    money_saved_estimate DECIMAL(10,2) DEFAULT 0,
    suspicious_products_avoided INTEGER DEFAULT 0,
    last_scan_at TIMESTAMPTZ,
    statistics_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. Reports and Exports Tables
CREATE TABLE public.generated_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    report_name TEXT NOT NULL,
    report_type TEXT NOT NULL,
    file_path TEXT,
    date_range_start DATE,
    date_range_end DATE,
    filters JSONB DEFAULT '{}',
    is_public BOOLEAN DEFAULT false,
    download_count INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 9. Essential Indexes
CREATE INDEX idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX idx_products_user_id ON public.products(user_id);
CREATE INDEX idx_products_platform ON public.products(platform);
CREATE INDEX idx_product_scans_user_id ON public.product_scans(user_id);
CREATE INDEX idx_product_scans_product_id ON public.product_scans(product_id);
CREATE INDEX idx_product_scans_scanned_at ON public.product_scans(scanned_at);
CREATE INDEX idx_product_scans_trust_score ON public.product_scans(trust_score);
CREATE INDEX idx_review_analyses_scan_id ON public.review_analyses(scan_id);
CREATE INDEX idx_review_analyses_is_suspicious ON public.review_analyses(is_suspicious);
CREATE INDEX idx_business_uploads_user_id ON public.business_uploads(user_id);
CREATE INDEX idx_business_uploads_upload_status ON public.business_uploads(upload_status);
CREATE INDEX idx_user_statistics_user_id ON public.user_statistics(user_id);
CREATE INDEX idx_user_statistics_date ON public.user_statistics(statistics_date);
CREATE INDEX idx_generated_reports_user_id ON public.generated_reports(user_id);

-- 10. Storage Buckets for File Uploads
-- Business document uploads (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'business-uploads',
    'business-uploads', 
    false,
    52428800, -- 50MB limit
    ARRAY['text/csv', 'application/json', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/plain']
);

-- User profile images (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'profile-images',
    'profile-images',
    true,
    2097152, -- 2MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
);

-- Report exports (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'report-exports',
    'report-exports',
    false,
    10485760, -- 10MB limit
    ARRAY['application/pdf', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
);

-- 11. Functions for Automatic Profile Creation and Statistics
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name, role)
    VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'consumer')::public.user_role
    );
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_statistics()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.user_statistics (
        user_id, 
        total_scans, 
        scans_this_month, 
        last_scan_at,
        statistics_date
    )
    VALUES (
        NEW.user_id,
        1,
        CASE WHEN DATE_TRUNC('month', NEW.scanned_at) = DATE_TRUNC('month', CURRENT_DATE) THEN 1 ELSE 0 END,
        NEW.scanned_at,
        CURRENT_DATE
    )
    ON CONFLICT (user_id, statistics_date) DO UPDATE SET
        total_scans = user_statistics.total_scans + 1,
        scans_this_month = CASE 
            WHEN DATE_TRUNC('month', NEW.scanned_at) = DATE_TRUNC('month', CURRENT_DATE) 
            THEN user_statistics.scans_this_month + 1 
            ELSE user_statistics.scans_this_month 
        END,
        last_scan_at = NEW.scanned_at,
        updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- 12. Triggers
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_product_scan_completed
    AFTER INSERT ON public.product_scans
    FOR EACH ROW EXECUTE FUNCTION public.update_user_statistics();

-- 13. Enable RLS on All Tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;

-- 14. RLS Policies - Core User Tables (Pattern 1)
CREATE POLICY "users_manage_own_user_profiles"
ON public.user_profiles
FOR ALL
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 15. RLS Policies - User Ownership (Pattern 2)
CREATE POLICY "users_manage_own_products"
ON public.products
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_manage_own_product_scans"
ON public.product_scans
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_manage_own_review_analyses"
ON public.review_analyses
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_manage_own_business_uploads"
ON public.business_uploads
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_manage_own_user_statistics"
ON public.user_statistics
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_manage_own_generated_reports"
ON public.generated_reports
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 16. Storage RLS Policies
-- Business uploads (private files)
CREATE POLICY "users_view_own_business_uploads"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'business-uploads' AND owner = auth.uid());

CREATE POLICY "users_upload_business_files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'business-uploads' 
    AND owner = auth.uid()
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "users_update_own_business_uploads"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'business-uploads' AND owner = auth.uid())
WITH CHECK (bucket_id = 'business-uploads' AND owner = auth.uid());

CREATE POLICY "users_delete_own_business_uploads"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'business-uploads' AND owner = auth.uid());

-- Profile images (public viewing, private uploading)
CREATE POLICY "public_can_view_profile_images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-images');

CREATE POLICY "users_upload_profile_images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-images' AND owner = auth.uid());

CREATE POLICY "users_manage_profile_images"
ON storage.objects
FOR UPDATE, DELETE
TO authenticated
USING (bucket_id = 'profile-images' AND owner = auth.uid());

-- Report exports (private files)
CREATE POLICY "users_view_own_reports"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'report-exports' AND owner = auth.uid());

CREATE POLICY "users_upload_reports"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'report-exports' 
    AND owner = auth.uid()
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "users_manage_reports"
ON storage.objects
FOR UPDATE, DELETE
TO authenticated
USING (bucket_id = 'report-exports' AND owner = auth.uid());

-- 17. Mock Data for Development
DO $$
DECLARE
    consumer_uuid UUID := gen_random_uuid();
    business_uuid UUID := gen_random_uuid();
    admin_uuid UUID := gen_random_uuid();
    product1_uuid UUID := gen_random_uuid();
    product2_uuid UUID := gen_random_uuid();
    scan1_uuid UUID := gen_random_uuid();
    scan2_uuid UUID := gen_random_uuid();
BEGIN
    -- Create auth users with complete field structure
    INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
        is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
        recovery_token, recovery_sent_at, email_change_token_new, email_change,
        email_change_sent_at, email_change_token_current, email_change_confirm_status,
        reauthentication_token, reauthentication_sent_at, phone, phone_change,
        phone_change_token, phone_change_sent_at
    ) VALUES
        (consumer_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'consumer@trustreview.com', crypt('password123', gen_salt('bf', 10)), now(), now(), now(),
         '{"full_name": "Consumer User", "role": "consumer"}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb,
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
        (business_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'business@trustreview.com', crypt('password123', gen_salt('bf', 10)), now(), now(), now(),
         '{"full_name": "Business User", "role": "business"}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb,
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
        (admin_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'admin@trustreview.com', crypt('password123', gen_salt('bf', 10)), now(), now(), now(),
         '{"full_name": "Admin User", "role": "admin"}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb,
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null);

    -- Create products for testing
    INSERT INTO public.products (id, user_id, platform, product_name, product_url, product_image_url, category, brand, price) VALUES
        (product1_uuid, consumer_uuid, 'amazon', 'Apple iPhone 15 Pro Max 256GB Natural Titanium', 
         'https://amazon.com/dp/example1', 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&h=400&fit=crop',
         'Electronics', 'Apple', 1199.00),
        (product2_uuid, consumer_uuid, 'yelp', 'Joe''s Pizza - Downtown Location',
         'https://yelp.com/biz/example2', 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=400&fit=crop',
         'Restaurant', 'Joe''s Pizza', 25.99);

    -- Create scan history
    INSERT INTO public.product_scans (id, user_id, product_id, platform, scan_status, trust_score, confidence, reviews_analyzed, authentic_percentage, suspicious_percentage, flagged_reviews, review_quality_score, reviewer_history_score, pattern_score, warnings) VALUES
        (scan1_uuid, consumer_uuid, product1_uuid, 'amazon', 'completed', 85, 'high', 1247, 78.50, 21.50, 15, 82, 75, 88, 
         ARRAY['Some reviews show repetitive language patterns', 'Unusual spike in 5-star reviews last month']),
        (scan2_uuid, consumer_uuid, product2_uuid, 'yelp', 'completed', 67, 'medium', 234, 65.00, 35.00, 12, 71, 62, 68,
         ARRAY['Multiple reviews from new accounts', 'Similar review patterns detected']);

    -- Create review analyses
    INSERT INTO public.review_analyses (scan_id, user_id, reviewer_name, review_content, review_rating, authenticity_score, is_suspicious, suspicious_patterns) VALUES
        (scan1_uuid, consumer_uuid, 'John D.', 'Great phone with amazing camera quality! Highly recommend for photography enthusiasts.', 5, 89.5, false, ARRAY[]::TEXT[]),
        (scan1_uuid, consumer_uuid, 'Sarah M.', 'Best phone ever amazing phone great phone love it so much', 5, 23.2, true, ARRAY['Repetitive language', 'Generic praise']),
        (scan2_uuid, consumer_uuid, 'Mike R.', 'Excellent pizza place with authentic Italian flavors. Great service and atmosphere.', 4, 91.8, false, ARRAY[]::TEXT[]),
        (scan2_uuid, consumer_uuid, 'User123', 'Great place good food fast service', 5, 31.5, true, ARRAY['Generic review', 'Username pattern']);

    -- Create business uploads for demo
    INSERT INTO public.business_uploads (user_id, file_name, file_path, upload_status, reviews_count) VALUES
        (business_uuid, 'amazon_reviews_q3.csv', 'business-uploads/' || business_uuid || '/amazon_reviews_q3.csv', 'completed', 1247),
        (business_uuid, 'yelp_reviews_august.json', 'business-uploads/' || business_uuid || '/yelp_reviews_august.json', 'processing', 543);

EXCEPTION
    WHEN foreign_key_violation THEN
        RAISE NOTICE 'Foreign key error during mock data insertion: %', SQLERRM;
    WHEN unique_violation THEN
        RAISE NOTICE 'Unique constraint error during mock data insertion: %', SQLERRM;
    WHEN OTHERS THEN
        RAISE NOTICE 'Unexpected error during mock data insertion: %', SQLERRM;
END $$;