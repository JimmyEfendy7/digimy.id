USE digipro;

-- Data seed for admins (WhatsApp OTP login only)
INSERT INTO admins (name, phone_number, role, profile_picture, is_active) VALUES
('Jimmy Efendi', '085271654890', 'super_admin', '/profiles/jimmy.jpg', TRUE),
('Irma Susanti', '083190857130', 'admin', '/profiles/irma.jpg', TRUE);

-- Data seed for users (customers - no password, WhatsApp OTP login only)
INSERT INTO users (name, email, phone_number, profile_picture, is_active) VALUES
('Budi Santoso', 'budi@example.com', '081234567890', '/profiles/budi.jpg', TRUE),
('Siti Rahayu', 'siti@example.com', '081234567891', '/profiles/siti.jpg', TRUE),
('Ahmad Rizki', 'ahmad@example.com', '081234567892', '/profiles/ahmad.jpg', TRUE),
('Dewi Lestari', 'dewi@example.com', '081234567893', '/profiles/dewi.jpg', TRUE),
('Arif Wibowo', 'arif@example.com', '081234567894', '/profiles/arif.jpg', TRUE);

-- Data seed for stores (mitra)
INSERT INTO stores (user_id, name, slug, description, logo, banner, phone_number, email, address, is_verified, is_active, balance) VALUES
(1, 'Budi Digital Store', 'budi-digital-store', 'Toko digital terlengkap untuk semua kebutuhan gaming Anda', '/stores/budi-logo.jpg', '/stores/budi-banner.jpg', '081234567890', 'toko@budidigital.com', 'Jl. Digital No. 123, Jakarta Selatan', TRUE, TRUE, 5000000.00),
(2, 'Siti Digital Services', 'siti-digital-services', 'Layanan digital profesional untuk kebutuhan bisnis Anda', '/stores/siti-logo.jpg', '/stores/siti-banner.jpg', '081234567891', 'toko@sitidigital.com', 'Jl. Teknologi No. 456, Bandung', TRUE, TRUE, 3500000.00),
(3, 'AhmadTech', 'ahmadtech', 'Penyedia layanan teknologi dan produk digital premium', '/stores/ahmad-logo.jpg', '/stores/ahmad-banner.jpg', '081234567892', 'toko@ahmadtech.com', 'Jl. Inovasi No. 789, Surabaya', TRUE, TRUE, 2750000.00);

-- Data seed for store_withdrawals
INSERT INTO store_withdrawals (store_id, amount, bank_name, account_number, account_name, status, notes, processed_by, processed_at) VALUES
(1, 1000000.00, 'Bank Mandiri', '1234567890', 'Budi Santoso', 'approved', 'Withdrawal processed successfully', 1, NOW() - INTERVAL 10 DAY),
(2, 750000.00, 'BCA', '0987654321', 'Siti Rahayu', 'approved', 'Withdrawal processed successfully', 1, NOW() - INTERVAL 5 DAY),
(3, 500000.00, 'BNI', '1122334455', 'Ahmad Rizki', 'pending', NULL, NULL, NULL);

-- Data seed for product_categories
INSERT INTO product_categories (name, slug, description, icon, is_active) VALUES
('Mobile Legends', 'mobile-legends', 'Produk digital untuk game Mobile Legends', '/icons/ml.png', TRUE),
('PUBG Mobile', 'pubg-mobile', 'Produk digital untuk game PUBG Mobile', '/icons/pubg.png', TRUE),
('Valorant', 'valorant', 'Produk digital untuk game Valorant', '/icons/valorant.png', TRUE),
('Genshin Impact', 'genshin-impact', 'Produk digital untuk game Genshin Impact', '/icons/genshin.png', TRUE),
('Free Fire', 'free-fire', 'Produk digital untuk game Free Fire', '/icons/ff.png', TRUE);

-- Data seed for products
INSERT INTO products (category_id, store_id, name, slug, description, poster_url, price, promo_price, stock, is_official, is_verified, is_active, created_by) VALUES
(1, NULL, 'Akun Mobile Legends Mythic', 'akun-ml-mythic-official', 'Akun Mobile Legends Rank Mythic dengan hero lengkap dan skin premium', '/products/ml-mythic.jpg', 1500000.00, 1200000.00, 3, TRUE, TRUE, TRUE, 'admin'),
(1, 1, 'Akun Mobile Legends Legend', 'akun-ml-legend-budi', 'Akun Mobile Legends Rank Legend dengan 50+ hero dan 20+ skin', '/products/ml-legend.jpg', 850000.00, NULL, 5, FALSE, TRUE, TRUE, 'store'),
(2, NULL, 'Akun PUBG Mobile Level 70', 'akun-pubg-70-official', 'Akun PUBG Mobile Level 70 dengan skin senjata premium', '/products/pubg-70.jpg', 1200000.00, 999000.00, 2, TRUE, TRUE, TRUE, 'admin'),
(2, 1, 'Akun PUBG Mobile Level 50', 'akun-pubg-50-budi', 'Akun PUBG Mobile Level 50 dengan achievement lengkap', '/products/pubg-50.jpg', 750000.00, NULL, 4, FALSE, TRUE, TRUE, 'store'),
(3, NULL, 'Akun Valorant Premium', 'akun-valorant-premium-official', 'Akun Valorant dengan agent lengkap dan skin premium', '/products/valorant-premium.jpg', 1000000.00, NULL, 3, TRUE, TRUE, TRUE, 'admin'),
(3, 3, 'Akun Valorant Standard', 'akun-valorant-standard-ahmad', 'Akun Valorant dengan 10+ agent dan 5+ skin', '/products/valorant-standard.jpg', 550000.00, 450000.00, 6, FALSE, TRUE, TRUE, 'store'),
(4, NULL, 'Akun Genshin Impact AR 55', 'akun-genshin-ar55-official', 'Akun Genshin Impact Adventure Rank 55 dengan karakter 5 bintang', '/products/genshin-ar55.jpg', 2000000.00, 1750000.00, 1, TRUE, TRUE, TRUE, 'admin'),
(4, 2, 'Akun Genshin Impact AR 45', 'akun-genshin-ar45-siti', 'Akun Genshin Impact Adventure Rank 45 dengan progress lengkap', '/products/genshin-ar45.jpg', 1200000.00, NULL, 2, FALSE, TRUE, TRUE, 'store'),
(5, NULL, 'Akun Free Fire Elite', 'akun-ff-elite-official', 'Akun Free Fire dengan item eksklusif dan koleksi senjata lengkap', '/products/ff-elite.jpg', 800000.00, 650000.00, 5, TRUE, TRUE, TRUE, 'admin'),
(5, 3, 'Akun Free Fire Standard', 'akun-ff-standard-ahmad', 'Akun Free Fire dengan progress level tinggi', '/products/ff-standard.jpg', 450000.00, NULL, 7, FALSE, TRUE, TRUE, 'store');

-- Data seed for product_reviews
INSERT INTO product_reviews (product_id, file_url, file_type) VALUES
(1, '/reviews/ml-mythic-1.jpg', 'image'),
(1, '/reviews/ml-mythic-2.jpg', 'image'),
(1, '/reviews/ml-mythic-video.mp4', 'video'),
(2, '/reviews/ml-legend-1.jpg', 'image'),
(2, '/reviews/ml-legend-2.jpg', 'image'),
(3, '/reviews/pubg-70-1.jpg', 'image'),
(3, '/reviews/pubg-70-video.mp4', 'video'),
(4, '/reviews/pubg-50-1.jpg', 'image'),
(5, '/reviews/valorant-premium-1.jpg', 'image'),
(5, '/reviews/valorant-premium-2.jpg', 'image'),
(5, '/reviews/valorant-premium-video.mp4', 'video'),
(7, '/reviews/genshin-ar55-1.jpg', 'image'),
(7, '/reviews/genshin-ar55-video.mp4', 'video'),
(9, '/reviews/ff-elite-1.jpg', 'image'),
(9, '/reviews/ff-elite-2.jpg', 'image');

-- Data seed for service_categories
INSERT INTO service_categories (name, slug, description, icon, is_active) VALUES
('Website', 'website', 'Layanan pembuatan dan pengembangan website', '/icons/website.png', TRUE),
('Digital Marketing', 'digital-marketing', 'Layanan pemasaran digital untuk bisnis Anda', '/icons/marketing.png', TRUE),
('Desain Grafis', 'desain-grafis', 'Layanan desain grafis profesional', '/icons/design.png', TRUE),
('Aplikasi Mobile', 'aplikasi-mobile', 'Layanan pembuatan aplikasi mobile', '/icons/mobile.png', TRUE);

-- Data seed for service_subcategories
INSERT INTO service_subcategories (category_id, name, slug, description, icon, is_active) VALUES
(1, 'Landing Page', 'landing-page', 'Pembuatan landing page untuk bisnis atau kampanye', '/icons/landing.png', TRUE),
(1, 'Website Bisnis', 'website-bisnis', 'Pembuatan website untuk kebutuhan bisnis', '/icons/business.png', TRUE),
(1, 'E-Commerce', 'e-commerce', 'Pembuatan toko online dengan fitur lengkap', '/icons/ecommerce.png', TRUE),
(1, 'Website Portfolio', 'website-portfolio', 'Pembuatan website portfolio personal atau bisnis', '/icons/portfolio.png', TRUE),
(2, 'Google Ads', 'google-ads', 'Layanan iklan di platform Google', '/icons/google.png', TRUE),
(2, 'Facebook Ads', 'facebook-ads', 'Layanan iklan di platform Facebook', '/icons/facebook.png', TRUE),
(2, 'TikTok Ads', 'tiktok-ads', 'Layanan iklan di platform TikTok', '/icons/tiktok.png', TRUE),
(2, 'SEO', 'seo', 'Layanan optimasi mesin pencari', '/icons/seo.png', TRUE),
(3, 'Logo Design', 'logo-design', 'Desain logo profesional untuk brand Anda', '/icons/logo.png', TRUE),
(3, 'UI/UX Design', 'ui-ux-design', 'Desain antarmuka dan pengalaman pengguna', '/icons/uiux.png', TRUE),
(3, 'Social Media Design', 'social-media-design', 'Desain konten untuk media sosial', '/icons/socialmedia.png', TRUE),
(4, 'Android App', 'android-app', 'Pembuatan aplikasi untuk platform Android', '/icons/android.png', TRUE),
(4, 'iOS App', 'ios-app', 'Pembuatan aplikasi untuk platform iOS', '/icons/ios.png', TRUE),
(4, 'Flutter App', 'flutter-app', 'Pembuatan aplikasi cross-platform dengan Flutter', '/icons/flutter.png', TRUE);

-- Data seed for services
INSERT INTO services (subcategory_id, store_id, name, slug, description, product_url, price, is_official, is_verified, is_active, created_by) VALUES
(1, NULL, 'Landing Page Basic', 'landing-page-basic-official', 'Layanan pembuatan landing page basic untuk bisnis Anda', '/services/landing-basic.jpg', 1000000.00, TRUE, TRUE, TRUE, 'admin'),
(1, NULL, 'Landing Page Premium', 'landing-page-premium-official', 'Layanan pembuatan landing page premium dengan fitur lengkap', '/services/landing-premium.jpg', 2500000.00, TRUE, TRUE, TRUE, 'admin'),
(1, NULL, 'Landing Page Advanced', 'landing-page-advanced-official', 'Layanan pembuatan landing page advanced dengan integrasi API', '/services/landing-advanced.jpg', 4000000.00, TRUE, TRUE, TRUE, 'admin'),
(1, 2, 'Landing Page Custom', 'landing-page-custom-siti', 'Layanan pembuatan landing page sesuai kebutuhan khusus', '/services/landing-custom.jpg', 3000000.00, FALSE, TRUE, TRUE, 'store'),
(2, NULL, 'Website Bisnis Basic', 'website-bisnis-basic-official', 'Website bisnis dengan 5 halaman utama', '/services/business-basic.jpg', 3000000.00, TRUE, TRUE, TRUE, 'admin'),
(2, NULL, 'Website Bisnis Premium', 'website-bisnis-premium-official', 'Website bisnis dengan 10 halaman dan fitur admin', '/services/business-premium.jpg', 5000000.00, TRUE, TRUE, TRUE, 'admin'),
(2, 2, 'Website Bisnis Custom', 'website-bisnis-custom-siti', 'Website bisnis yang disesuaikan dengan kebutuhan Anda', '/services/business-custom.jpg', 4500000.00, FALSE, TRUE, TRUE, 'store'),
(5, NULL, 'Google Ads Basic', 'google-ads-basic-official', 'Layanan iklan Google Ads selama 1 bulan', '/services/google-basic.jpg', 1500000.00, TRUE, TRUE, TRUE, 'admin'),
(5, NULL, 'Google Ads Premium', 'google-ads-premium-official', 'Layanan iklan Google Ads selama 3 bulan', '/services/google-premium.jpg', 4000000.00, TRUE, TRUE, TRUE, 'admin'),
(6, NULL, 'Facebook Ads Basic', 'facebook-ads-basic-official', 'Layanan iklan Facebook Ads selama 1 bulan', '/services/facebook-basic.jpg', 1200000.00, TRUE, TRUE, TRUE, 'admin'),
(6, 2, 'Facebook Ads Premium', 'facebook-ads-premium-siti', 'Layanan iklan Facebook Ads selama 3 bulan', '/services/facebook-premium.jpg', 3500000.00, FALSE, TRUE, TRUE, 'store'),
(7, NULL, 'TikTok Ads Basic', 'tiktok-ads-basic-official', 'Layanan iklan TikTok Ads selama 1 bulan', '/services/tiktok-basic.jpg', 2000000.00, TRUE, TRUE, TRUE, 'admin'),
(7, 2, 'TikTok Ads Premium', 'tiktok-ads-premium-siti', 'Layanan iklan TikTok Ads selama 3 bulan', '/services/tiktok-premium.jpg', 5500000.00, FALSE, TRUE, TRUE, 'store');

-- Data seed for service_addons
INSERT INTO service_addons (category_id, subcategory_id, name, slug, description, product_url, price, is_active) VALUES
(1, 1, 'Custom Domain .com', 'custom-domain-com', 'Domain .com untuk website Anda', '/addons/domain-com.jpg', 200000.00, TRUE),
(1, 1, 'Custom Domain .id', 'custom-domain-id', 'Domain .id untuk website Anda', '/addons/domain-id.jpg', 300000.00, TRUE),
(1, 1, 'Custom Domain .my.id', 'custom-domain-myid', 'Domain .my.id untuk website Anda', '/addons/domain-myid.jpg', 100000.00, TRUE),
(1, 2, 'Custom Domain .com', 'custom-domain-com-business', 'Domain .com untuk website bisnis Anda', '/addons/domain-com.jpg', 200000.00, TRUE),
(1, 2, 'Email Bisnis', 'email-bisnis', '5 akun email bisnis dengan nama domain Anda', '/addons/email-business.jpg', 500000.00, TRUE),
(1, 2, 'SSL Premium', 'ssl-premium', 'Sertifikat SSL premium untuk keamanan website', '/addons/ssl.jpg', 350000.00, TRUE),
(1, 3, 'Custom Domain .com', 'custom-domain-com-ecommerce', 'Domain .com untuk toko online Anda', '/addons/domain-com.jpg', 200000.00, TRUE),
(1, 3, 'Payment Gateway', 'payment-gateway', 'Integrasi dengan payment gateway', '/addons/payment.jpg', 800000.00, TRUE),
(2, 5, 'Pengelolaan Lebih Lama', 'pengelolaan-extended-google', 'Perpanjangan pengelolaan Google Ads selama 1 bulan', '/addons/extended-management.jpg', 1000000.00, TRUE),
(2, 6, 'Pengelolaan Lebih Lama', 'pengelolaan-extended-fb', 'Perpanjangan pengelolaan Facebook Ads selama 1 bulan', '/addons/extended-management.jpg', 1000000.00, TRUE),
(2, 7, 'Pengelolaan Lebih Lama', 'pengelolaan-extended-tiktok', 'Perpanjangan pengelolaan TikTok Ads selama 1 bulan', '/addons/extended-management.jpg', 1000000.00, TRUE);

-- Data seed for auctions
INSERT INTO auctions (product_id, store_id, name, slug, description, poster_url, initial_price, current_price, min_bid_increment, start_date, end_date, status, is_verified, winner_id, created_by) VALUES
(1, NULL, 'Lelang Akun ML Mythic', 'lelang-akun-ml-mythic', 'Lelang akun Mobile Legends Mythic dengan hero dan skin langka', '/auctions/ml-mythic.jpg', 1000000.00, 1300000.00, 50000.00, DATE_FORMAT(NOW() - INTERVAL 2 DAY, '%Y-%m-%d %H:%i:%s'), DATE_FORMAT(NOW() + INTERVAL 5 DAY, '%Y-%m-%d %H:%i:%s'), 'active', TRUE, NULL, 'admin'),
(3, NULL, 'Lelang Akun PUBG Level 70', 'lelang-akun-pubg-70', 'Lelang akun PUBG Mobile Level 70 dengan skin senjata premium', '/auctions/pubg-70.jpg', 800000.00, 1000000.00, 50000.00, DATE_FORMAT(NOW() - INTERVAL 3 DAY, '%Y-%m-%d %H:%i:%s'), DATE_FORMAT(NOW() + INTERVAL 2 DAY, '%Y-%m-%d %H:%i:%s'), 'active', TRUE, NULL, 'admin'),
(7, NULL, 'Lelang Akun Genshin AR 55', 'lelang-akun-genshin-ar55', 'Lelang akun Genshin Impact AR 55 dengan karakter 5 bintang langka', '/auctions/genshin-ar55.jpg', 1500000.00, 1800000.00, 100000.00, DATE_FORMAT(NOW() - INTERVAL 1 DAY, '%Y-%m-%d %H:%i:%s'), DATE_FORMAT(NOW() + INTERVAL 7 DAY, '%Y-%m-%d %H:%i:%s'), 'active', TRUE, NULL, 'admin'),
(2, 1, 'Lelang Akun ML Legend', 'lelang-akun-ml-legend', 'Lelang akun Mobile Legends Legend dengan skin langka', '/auctions/ml-legend.jpg', 700000.00, 850000.00, 50000.00, DATE_FORMAT(NOW() - INTERVAL 2 DAY, '%Y-%m-%d %H:%i:%s'), DATE_FORMAT(NOW() + INTERVAL 3 DAY, '%Y-%m-%d %H:%i:%s'), 'active', TRUE, NULL, 'store'),
(8, 2, 'Lelang Akun Genshin AR 45', 'lelang-akun-genshin-ar45', 'Lelang akun Genshin Impact AR 45 dengan progress lengkap', '/auctions/genshin-ar45.jpg', 900000.00, 1050000.00, 50000.00, DATE_FORMAT(NOW() - INTERVAL 3 DAY, '%Y-%m-%d %H:%i:%s'), DATE_FORMAT(NOW() + INTERVAL 4 DAY, '%Y-%m-%d %H:%i:%s'), 'active', TRUE, NULL, 'store');

-- Data seed for auction_bids
INSERT INTO auction_bids (auction_id, user_id, bidder_name, bidder_phone, bid_amount, created_at) VALUES
(1, 1, 'Budi Santoso', '081234567890', 1100000.00, NOW() - INTERVAL 1 DAY - INTERVAL 12 HOUR),
(1, 2, 'Siti Rahayu', '081234567891', 1200000.00, NOW() - INTERVAL 1 DAY - INTERVAL 6 HOUR),
(1, 3, 'Ahmad Rizki', '081234567892', 1300000.00, NOW() - INTERVAL 12 HOUR),
(2, 1, 'Budi Santoso', '081234567890', 900000.00, NOW() - INTERVAL 2 DAY),
(2, 4, 'Dewi Lestari', '081234567893', 1000000.00, NOW() - INTERVAL 1 DAY),
(3, 2, 'Siti Rahayu', '081234567891', 1600000.00, NOW() - INTERVAL 12 HOUR),
(3, 4, 'Dewi Lestari', '081234567893', 1700000.00, NOW() - INTERVAL 6 HOUR),
(3, 5, 'Arif Wibowo', '081234567894', 1800000.00, NOW() - INTERVAL 3 HOUR),
(4, 3, 'Ahmad Rizki', '081234567892', 750000.00, NOW() - INTERVAL 1 DAY),
(4, 5, 'Arif Wibowo', '081234567894', 850000.00, NOW() - INTERVAL 12 HOUR),
(5, 1, 'Budi Santoso', '081234567890', 950000.00, NOW() - INTERVAL 2 DAY),
(5, 2, 'Siti Rahayu', '081234567891', 1000000.00, NOW() - INTERVAL 1 DAY),
(5, 3, 'Ahmad Rizki', '081234567892', 1050000.00, NOW() - INTERVAL 12 HOUR);

-- Data seed for transactions
INSERT INTO transactions (user_id, transaction_code, customer_name, customer_phone, customer_email, institution_name, additional_notes, payment_method, payment_status, total_amount, midtrans_transaction_id, payment_token, payment_url, payment_expiry, invoice_url, transaction_type, created_at) VALUES
(1, 'TRX-PROD-001', 'Budi Santoso', '081234567890', 'budi@example.com', NULL, NULL, 'bank_transfer', 'paid', 850000.00, 'mid-trx-1234567890', 'token-1234567890', 'https://app.midtrans.com/snap/v2/vtweb/1234567890', DATE_ADD(NOW() - INTERVAL 15 DAY, INTERVAL 1 DAY), '/invoices/trx-prod-001.pdf', 'product', NOW() - INTERVAL 15 DAY),
(2, 'TRX-PROD-002', 'Siti Rahayu', '081234567891', 'siti@example.com', NULL, NULL, 'bank_transfer', 'paid', 1200000.00, 'mid-trx-2345678901', 'token-2345678901', 'https://app.midtrans.com/snap/v2/vtweb/2345678901', DATE_ADD(NOW() - INTERVAL 12 DAY, INTERVAL 1 DAY), '/invoices/trx-prod-002.pdf', 'product', NOW() - INTERVAL 12 DAY),
(NULL, 'TRX-PROD-003', 'Novi Indah', '081234567895', 'novi@example.com', NULL, NULL, 'virtual_account', 'paid', 450000.00, 'mid-trx-3456789012', 'token-3456789012', 'https://app.midtrans.com/snap/v2/vtweb/3456789012', DATE_ADD(NOW() - INTERVAL 10 DAY, INTERVAL 1 DAY), '/invoices/trx-prod-003.pdf', 'product', NOW() - INTERVAL 10 DAY),
(3, 'TRX-SERV-001', 'Ahmad Rizki', '081234567892', 'ahmad@example.com', 'PT Digital Maju', 'Tolong sertakan fitur chat', 'bank_transfer', 'paid', 3500000.00, 'mid-trx-4567890123', 'token-4567890123', 'https://app.midtrans.com/snap/v2/vtweb/4567890123', DATE_ADD(NOW() - INTERVAL 8 DAY, INTERVAL 1 DAY), '/invoices/trx-serv-001.pdf', 'service', NOW() - INTERVAL 8 DAY),
(4, 'TRX-SERV-002', 'Dewi Lestari', '081234567893', 'dewi@example.com', 'CV Kreatif Indonesia', 'Butuh revisi maksimal 3x', 'virtual_account', 'paid', 5500000.00, 'mid-trx-5678901234', 'token-5678901234', 'https://app.midtrans.com/snap/v2/vtweb/5678901234', DATE_ADD(NOW() - INTERVAL 5 DAY, INTERVAL 1 DAY), '/invoices/trx-serv-002.pdf', 'service', NOW() - INTERVAL 5 DAY),
(NULL, 'TRX-SERV-003', 'Hadi Nugroho', '081234567896', 'hadi@example.com', 'PT Teknologi Baru', 'Deadline 2 minggu dari sekarang', 'bank_transfer', 'paid', 4000000.00, 'mid-trx-6789012345', 'token-6789012345', 'https://app.midtrans.com/snap/v2/vtweb/6789012345', DATE_ADD(NOW() - INTERVAL 3 DAY, INTERVAL 1 DAY), '/invoices/trx-serv-003.pdf', 'service', NOW() - INTERVAL 3 DAY),
(5, 'TRX-AUCT-001', 'Arif Wibowo', '081234567894', 'arif@example.com', NULL, NULL, 'bank_transfer', 'paid', 1600000.00, 'mid-trx-7890123456', 'token-7890123456', 'https://app.midtrans.com/snap/v2/vtweb/7890123456', DATE_ADD(NOW() - INTERVAL 20 DAY, INTERVAL 1 DAY), '/invoices/trx-auct-001.pdf', 'auction', NOW() - INTERVAL 20 DAY),
(NULL, 'TRX-PROD-004', 'Rudi Pratama', '081234567897', 'rudi@example.com', NULL, NULL, 'credit_card', 'pending', 750000.00, 'mid-trx-8901234567', 'token-8901234567', 'https://app.midtrans.com/snap/v2/vtweb/8901234567', DATE_ADD(NOW(), INTERVAL 1 DAY), NULL, 'product', NOW() - INTERVAL 1 HOUR),
(NULL, 'TRX-SERV-004', 'Maya Sari', '081234567898', 'maya@example.com', 'PT Solusi Digital', 'Perlu konsultasi sebelum mulai', 'gopay', 'pending', 2500000.00, 'mid-trx-9012345678', 'token-9012345678', 'https://app.midtrans.com/snap/v2/vtweb/9012345678', DATE_ADD(NOW(), INTERVAL 1 DAY), NULL, 'service', NOW() - INTERVAL 2 HOUR);

-- Data seed for transaction_items
INSERT INTO transaction_items (transaction_id, product_id, service_id, addon_id, auction_id, store_id, item_name, item_price, quantity, subtotal, is_addon, status) VALUES
(1, 2, NULL, NULL, NULL, 1, 'Akun Mobile Legends Legend', 850000.00, 1, 850000.00, FALSE, 'completed'),
(2, 3, NULL, NULL, NULL, NULL, 'Akun PUBG Mobile Level 70', 1200000.00, 1, 1200000.00, FALSE, 'completed'),
(3, 10, NULL, NULL, NULL, 3, 'Akun Free Fire Standard', 450000.00, 1, 450000.00, FALSE, 'completed'),
(4, NULL, 7, NULL, NULL, 2, 'Website Bisnis Custom', 3000000.00, 1, 3000000.00, FALSE, 'completed'),
(4, NULL, NULL, 4, NULL, NULL, 'Custom Domain .com', 200000.00, 1, 200000.00, TRUE, 'completed'),
(4, NULL, NULL, 5, NULL, NULL, 'Email Bisnis', 300000.00, 1, 300000.00, TRUE, 'completed'),
(5, NULL, 9, NULL, NULL, NULL, 'Google Ads Premium', 4000000.00, 1, 4000000.00, FALSE, 'completed'),
(5, NULL, NULL, 9, NULL, NULL, 'Pengelolaan Lebih Lama', 1500000.00, 1, 1500000.00, TRUE, 'completed'),
(6, NULL, 1, NULL, NULL, NULL, 'Landing Page Basic', 1000000.00, 1, 1000000.00, FALSE, 'completed'),
(6, NULL, NULL, 1, NULL, NULL, 'Custom Domain .com', 200000.00, 1, 200000.00, TRUE, 'completed'),
(6, NULL, 13, NULL, NULL, 2, 'TikTok Ads Premium', 2800000.00, 1, 2800000.00, FALSE, 'processing'),
(7, NULL, NULL, NULL, 3, NULL, 'Lelang Akun Genshin AR 55', 1600000.00, 1, 1600000.00, FALSE, 'completed');

-- Data seed for testimonials
INSERT INTO testimonials (user_id, transaction_item_id, product_id, service_id, rating, comment, is_approved) VALUES
(1, 1, 2, NULL, 5, 'Akun bagus dan sesuai deskripsi, admin toko ramah dan cepat tanggap', TRUE),
(2, 2, 3, NULL, 4, 'Akun PUBG sudah saya terima dengan baik, terima kasih', TRUE),
(3, 4, NULL, 7, 5, 'Website bisnis custom yang dibuat sangat profesional dan sesuai kebutuhan', TRUE),
(4, 7, NULL, 9, 4, 'Layanan Google Ads cukup efektif untuk bisnis saya, traffic meningkat', TRUE),
(5, 12, NULL, NULL, 5, 'Proses lelang berjalan lancar dan akun yang saya dapatkan sesuai deskripsi', TRUE);

-- Data seed for payment_callbacks
INSERT INTO payment_callbacks (transaction_id, order_id, payment_type, transaction_status, fraud_status, amount, transaction_time, signature_key, raw_response) VALUES
(1, 'TRX-PROD-001', 'bank_transfer', 'settlement', 'accept', 850000.00, NOW() - INTERVAL 14 DAY, 'midtrans-signature-key-1', '{"transaction_id":"mid-trx-1234567890","order_id":"TRX-PROD-001","payment_type":"bank_transfer","transaction_status":"settlement","fraud_status":"accept","gross_amount":"850000.00"}'),
(2, 'TRX-PROD-002', 'bank_transfer', 'settlement', 'accept', 1200000.00, NOW() - INTERVAL 11 DAY, 'midtrans-signature-key-2', '{"transaction_id":"mid-trx-2345678901","order_id":"TRX-PROD-002","payment_type":"bank_transfer","transaction_status":"settlement","fraud_status":"accept","gross_amount":"1200000.00"}'),
(3, 'TRX-PROD-003', 'echannel', 'settlement', 'accept', 450000.00, NOW() - INTERVAL 9 DAY, 'midtrans-signature-key-3', '{"transaction_id":"mid-trx-3456789012","order_id":"TRX-PROD-003","payment_type":"echannel","transaction_status":"settlement","fraud_status":"accept","gross_amount":"450000.00"}'),
(4, 'TRX-SERV-001', 'bank_transfer', 'settlement', 'accept', 3500000.00, NOW() - INTERVAL 7 DAY, 'midtrans-signature-key-4', '{"transaction_id":"mid-trx-4567890123","order_id":"TRX-SERV-001","payment_type":"bank_transfer","transaction_status":"settlement","fraud_status":"accept","gross_amount":"3500000.00"}'),
(5, 'TRX-SERV-002', 'echannel', 'settlement', 'accept', 5500000.00, NOW() - INTERVAL 4 DAY, 'midtrans-signature-key-5', '{"transaction_id":"mid-trx-5678901234","order_id":"TRX-SERV-002","payment_type":"echannel","transaction_status":"settlement","fraud_status":"accept","gross_amount":"5500000.00"}'),
(6, 'TRX-SERV-003', 'bank_transfer', 'settlement', 'accept', 4000000.00, NOW() - INTERVAL 2 DAY, 'midtrans-signature-key-6', '{"transaction_id":"mid-trx-6789012345","order_id":"TRX-SERV-003","payment_type":"bank_transfer","transaction_status":"settlement","fraud_status":"accept","gross_amount":"4000000.00"}'),
(7, 'TRX-AUCT-001', 'bank_transfer', 'settlement', 'accept', 1600000.00, NOW() - INTERVAL 19 DAY, 'midtrans-signature-key-7', '{"transaction_id":"mid-trx-7890123456","order_id":"TRX-AUCT-001","payment_type":"bank_transfer","transaction_status":"settlement","fraud_status":"accept","gross_amount":"1600000.00"}'); 