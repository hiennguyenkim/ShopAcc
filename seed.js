require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Category = require('./models/Category');
const Collection = require('./models/Collection');
const GameAccount = require('./models/GameAccount');
const Coupon = require('./models/Coupon');
const Order = require('./models/Order');
const SiteSetting = require('./models/SiteSetting');

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/gamenick_store';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for seeding...');

    // Clear existing data
    await User.deleteMany();
    await Category.deleteMany();
    await Collection.deleteMany();
    await GameAccount.deleteMany();
    await Coupon.deleteMany();
    await Order.deleteMany();
    await SiteSetting.deleteMany();
    console.log('Cleared all collections.');

    // 1. Create Users
    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash('Admin@123', salt);
    const staffPassword = await bcrypt.hash('Staff@123', salt);
    const userPassword = await bcrypt.hash('User@123', salt);

    const admin = await User.create({
      fullName: 'Quản trị viên',
      username: 'admin',
      email: 'admin@gamenick.com',
      phone: '0987654321',
      password: adminPassword,
      role: 'admin',
      isActive: true,
      balance: 10000000
    });

    const staff = await User.create({
      fullName: 'Nhân viên kiểm duyệt',
      username: 'staff',
      email: 'staff@gamenick.com',
      phone: '0981234567',
      password: staffPassword,
      role: 'staff',
      isActive: true,
      balance: 5000000
    });

    const user1 = await User.create({
      fullName: 'Nguyễn Khánh Nam',
      username: 'namkhank',
      email: 'namkhank@gmail.com',
      phone: '0912345678',
      password: userPassword,
      role: 'user',
      isActive: true,
      balance: 1000000 // Seed with 1,000,000đ for easy testing
    });

    const user2 = await User.create({
      fullName: 'Trần Minh Đức',
      username: 'ductran',
      email: 'ductran@gmail.com',
      phone: '0934567890',
      password: userPassword,
      role: 'user',
      isActive: true,
      balance: 150000 // Seed with 150,000đ
    });

    const user3 = await User.create({
      fullName: 'Phạm Thu Thảo',
      username: 'thaopham',
      email: 'thaopham@gmail.com',
      phone: '0976543210',
      password: userPassword,
      role: 'user',
      isActive: true,
      balance: 0
    });

    console.log('Seeded Users successfully.');

    // 2. Create Categories
    const catLienQuan = await Category.create({
      name: 'Liên Quân Mobile',
      slug: 'lien-quan-mobile',
      description: 'Nick Liên Quân Mobile giá rẻ, uy tín, đầy đủ skin SS tuyệt sắc.',
      image: '/uploads/categories/default-lq.png'
    });

    const catFreeFire = await Category.create({
      name: 'Free Fire',
      slug: 'free-fire',
      description: 'Tài khoản Free Fire cực VIP, súng tiến hóa cấp tối đa.',
      image: '/uploads/categories/default-ff.png'
    });

    const catFifa = await Category.create({
      name: 'FIFA Mobile',
      slug: 'fifa-mobile',
      description: 'Nick FIFA Mobile OVR cao, đội hình nhiều cầu thủ huyền thoại.',
      image: '/uploads/categories/default-fifa.png'
    });

    const catLol = await Category.create({
      name: 'Liên Minh Huyền Thoại',
      slug: 'lien-minh-huyen-thoai',
      description: 'Tài khoản LMHT (LOL) nhiều trang phục hiếm, rank cao.',
      image: '/uploads/categories/default-lol.png'
    });

    const catPubg = await Category.create({
      name: 'PUBG Mobile',
      slug: 'pubg-mobile',
      description: 'Nick PUBG Mobile có xe xịn, súng nâng cấp và skin hiếm.',
      image: '/uploads/categories/default-pubg.png'
    });

    console.log('Seeded Categories successfully.');

    // 3. Create Game Accounts
    // 2 LQ Mobile accounts
    const accLQ1 = await GameAccount.create({
      code: 'LQ001',
      name: 'Nick Liên Quân 70 Tướng, Full Ngọc, Skin Nakroth Lôi Quang',
      slug: 'nick-lien-quan-70-tuong-full-ngoc-skin-nakroth-loi-quang',
      gameType: 'lien_quan',
      category: catLienQuan._id,
      images: [],
      price: 250000,
      oldPrice: 350000,
      description: 'Nick cực đẹp, phù hợp leo hạng cao thủ. Giao dịch tự động.',
      rank: 'Kim Cương I',
      level: '30',
      server: 'Việt Nam',
      accountType: 'Trắng thông tin',
      loginInfo: {
        username: 'nakroth_loiquang_lq',
        password: 'passwordLQ123',
        loginMethod: 'Garena',
        linkedEmail: 'nak@gamenick.com',
        securityNote: 'Đăng nhập Garena bằng app Authenticator.'
      },
      lienQuanInfo: {
        heroCount: 70,
        skinCount: 95,
        skinACount: 30,
        skinSCount: 15,
        skinSSCount: 5,
        rareSkins: ['Nakroth Lôi Quang', 'Murad Siêu Việt'],
        quanHuy: 50,
        ruby: 800
      },
      warrantyDays: 7,
      status: 'available'
    });

    const accLQ2 = await GameAccount.create({
      code: 'LQ002',
      name: 'Acc Liên Quân 105 Tướng, 220 Trang Phục Siêu VIP',
      slug: 'acc-lien-quan-105-tuong-220-trang-phuc-sieu-vip',
      gameType: 'lien_quan',
      category: catLienQuan._id,
      images: [],
      price: 900000,
      oldPrice: 1200000,
      description: 'Nick đầy đủ tướng, skin SS tuyệt sắc, ngọc chuẩn 90 bài bổ trợ.',
      rank: 'Tinh Anh II',
      level: '30',
      server: 'Việt Nam',
      accountType: 'SĐT có thể thay đổi',
      loginInfo: {
        username: 'lienquan_vipacc',
        password: 'passLQVip99',
        loginMethod: 'Garena',
        linkedEmail: '',
        securityNote: 'Sau khi nhận nick cần liên kết ngay SĐT cá nhân.'
      },
      lienQuanInfo: {
        heroCount: 105,
        skinCount: 220,
        skinACount: 60,
        skinSCount: 40,
        skinSSCount: 15,
        rareSkins: ['Tulip Thần Sứ', 'Valhein Vũ Khí Tối Thượng'],
        quanHuy: 200,
        ruby: 1500
      },
      warrantyDays: 30,
      status: 'available'
    });

    // 2 FF accounts
    const accFF1 = await GameAccount.create({
      code: 'FF001',
      name: 'Nick Free Fire Có Súng AK Rồng Xanh Cực Đẹp',
      slug: 'nick-free-fire-co-sung-ak-rong-xanh-cur-dep',
      gameType: 'free_fire',
      category: catFreeFire._id,
      images: [],
      price: 150000,
      oldPrice: 200000,
      description: 'Acc thích hợp cho ae cày cuốc, súng AK cấp 4 mạnh mẽ.',
      rank: 'Bạch Kim IV',
      level: '52',
      server: 'Việt Nam',
      accountType: 'Trắng thông tin',
      loginInfo: {
        username: 'ff_rongxanh_ak',
        password: 'passwordFF1',
        loginMethod: 'Facebook',
        linkedEmail: 'rongxanh@gmail.com',
        securityNote: 'Đăng nhập qua Facebook. Nhớ đổi email liên kết ngay.'
      },
      freeFireInfo: {
        characterCount: 25,
        outfitCount: 45,
        gunSkinCount: 12,
        petCount: 5,
        diamond: 120,
        rareItems: ['AK Rồng Xanh Cấp 4']
      },
      warrantyDays: 3,
      status: 'available'
    });

    const accFF2 = await GameAccount.create({
      code: 'FF002',
      name: 'Nick Free Fire VIP - Quỷ Dạ Xoa, M1014 Tiếng Hét',
      slug: 'nick-free-fire-vip-quy-da-xoa-m1014-tieng-het',
      gameType: 'free_fire',
      category: catFreeFire._id,
      images: [],
      price: 600000,
      oldPrice: 850000,
      description: 'Hàng hiếm Quỷ Dạ Xoa siêu VIP cho ae game thủ chuyên nghiệp.',
      rank: 'Kim Cương IV',
      level: '78',
      server: 'Việt Nam',
      accountType: 'Trắng thông tin',
      loginInfo: {
        username: 'ff_quydaxoa_m10',
        password: 'daxoaPasswordFF',
        loginMethod: 'Facebook',
        linkedEmail: 'quydaxoa@gmail.com',
        securityNote: 'Xác nhận mã bảo mật 2 lớp Facebook khi login.'
      },
      freeFireInfo: {
        characterCount: 40,
        outfitCount: 110,
        gunSkinCount: 35,
        petCount: 12,
        diamond: 450,
        rareItems: ['Quỷ Dạ Xoa', 'M1014 Tiếng Hét Thần Chết']
      },
      warrantyDays: 15,
      status: 'available'
    });

    // 2 FIFA accounts
    const accFifa1 = await GameAccount.create({
      code: 'FIFA001',
      name: 'Nick FIFA Mobile OVR 130 Đội Hình Real Madrid Cực Khủng',
      slug: 'nick-fifa-mobile-ovr-130-doi-hinh-real-madrid-cur-khung',
      gameType: 'fifa_mobile',
      category: catFifa._id,
      images: [],
      price: 350000,
      oldPrice: 450000,
      description: 'Đội hình Real full cầu thủ chất lượng cao, sút bao cháy.',
      rank: 'Huyền Thoại III',
      level: '28',
      server: 'Châu Á',
      accountType: 'Trắng thông tin',
      loginInfo: {
        username: 'fifa_realmadrid130',
        password: 'passwordFifa1',
        loginMethod: 'Google Play',
        linkedEmail: 'fifareal@gamenick.com'
      },
      fifaInfo: {
        ovr: 130,
        teamValue: 850000000,
        playerCount: 45,
        rarePlayers: ['Cristiano Ronaldo Prime Icon', 'Zinedine Zidane Icon'],
        coins: 12000000,
        fcPoints: 800,
        formation: '4-3-3'
      },
      warrantyDays: 7,
      status: 'available'
    });

    const accFifa2 = await GameAccount.create({
      code: 'FIFA002',
      name: 'Acc FIFA Mobile OVR 138 Đội Hình Gullit & Ronaldinho',
      slug: 'acc-fifa-mobile-ovr-138-doi-hinh-gullit-ronaldinho',
      gameType: 'fifa_mobile',
      category: catFifa._id,
      images: [],
      price: 1200000,
      oldPrice: 1500000,
      description: 'Top đội hình quốc dân, giá cực hời cho ae FIFA.',
      rank: 'Huyền Thoại I',
      level: '42',
      server: 'Châu Á',
      accountType: 'Trắng thông tin',
      loginInfo: {
        username: 'fifa_gullit_ron',
        password: 'gullitronpassFifa',
        loginMethod: 'Nexon Account'
      },
      fifaInfo: {
        ovr: 138,
        teamValue: 2400000000,
        playerCount: 68,
        rarePlayers: ['Ruud Gullit Prime', 'Ronaldinho Icon', 'Ronaldo De Lima Prime'],
        coins: 45000000,
        fcPoints: 3200,
        formation: '4-1-2-1-2'
      },
      warrantyDays: 30,
      status: 'available'
    });

    // 2 LOL accounts
    const accLOL1 = await GameAccount.create({
      code: 'LOL001',
      name: 'Acc LMHT Rank Bạch Kim - 120 Trang Phục, Yasuo KMT',
      slug: 'acc-lmht-rank-bach-kim-120-trang-phuc-yasuo-kmt',
      gameType: 'lol',
      category: catLol._id,
      images: [],
      price: 200000,
      oldPrice: 300000,
      description: 'Nick Liên Minh giá rẻ cày cuốc, full tướng Yasuo.',
      rank: 'Bạch Kim III',
      level: '142',
      server: 'Việt Nam (Riot)',
      accountType: 'Riot Account trắng',
      loginInfo: {
        username: 'riot_yasuo_kmt',
        password: 'yasuoPasswordRiot',
        loginMethod: 'Riot Games'
      },
      lolInfo: {
        championCount: 110,
        skinCount: 120,
        rareSkins: ['Yasuo Kiếm Khách Không Gian', 'Lee Sin Tuyệt Vô Thần'],
        rp: 150,
        blueEssence: 24000
      },
      warrantyDays: 5,
      status: 'available'
    });

    const accLOL2 = await GameAccount.create({
      code: 'LOL002',
      name: 'Acc LMHT VIP - Riven Quán Quân 2012, 350 Trang Phục',
      slug: 'acc-lmht-vip-riven-quan-quan-2012-350-trang-phuc',
      gameType: 'lol',
      category: catLol._id,
      images: [],
      price: 1800000,
      oldPrice: 2500000,
      description: 'Nick siêu cổ điển sở hữu Riven Quán Quân 2012 cực kỳ quý hiếm.',
      rank: 'Kim Cương I',
      level: '358',
      server: 'Việt Nam (Riot)',
      accountType: 'Riot Account trắng',
      loginInfo: {
        username: 'riven2012_quan_quan',
        password: 'rivenPasswordRiotVip',
        loginMethod: 'Riot Games'
      },
      lolInfo: {
        championCount: 165,
        skinCount: 350,
        rareSkins: ['Riven Quán Quân 2012', 'Lux Thập Đại Nguyên Tố', 'Udyr Tứ Linh Vệ Hồn'],
        rp: 800,
        blueEssence: 92000
      },
      warrantyDays: 45,
      status: 'available'
    });

    // 2 PUBG Mobile accounts
    const accPUBG1 = await GameAccount.create({
      code: 'PUBG001',
      name: 'Nick PUBG Mobile M416 Băng Giá Cấp 4, Xe Thể Thao',
      slug: 'nick-pubg-mobile-m416-bang-gia-cap-4-xe-the-thao',
      gameType: 'pubg',
      category: catPubg._id,
      images: [],
      price: 450000,
      oldPrice: 600000,
      description: 'Sở hữu M416 Băng Giá bắn cực phê. Bàn giao nhanh chóng.',
      rank: 'Kim Cương II',
      level: '62',
      server: 'Global',
      accountType: 'Trắng thông tin',
      loginInfo: {
        username: 'pubg_bang_gia_m4',
        password: 'passwordPubg1',
        loginMethod: 'Twitter'
      },
      pubgInfo: {
        outfitCount: 32,
        gunSkinCount: 18,
        vehicleSkinCount: 3,
        uc: 180,
        rareItems: ['M416 Băng Giá Cấp 4', 'Dacia Thể Thao Đỏ']
      },
      warrantyDays: 7,
      status: 'available'
    });

    const accPUBG2 = await GameAccount.create({
      code: 'PUBG002',
      name: 'Acc PUBG Mobile Siêu VIP - Pharaon Cấp 6, M416 Băng Giá Cấp 7',
      slug: 'acc-pubg-mobile-sieu-vip-pharaon-cap-6-m416-bang-gia-cap-7',
      gameType: 'pubg',
      category: catPubg._id,
      images: [],
      price: 3500000,
      oldPrice: 4500000,
      description: 'Nick khủng cực phẩm cho ae đại gia đam mê PUBG.',
      rank: 'Chí Tôn',
      level: '85',
      server: 'Global',
      accountType: 'Trắng thông tin',
      loginInfo: {
        username: 'pubg_vip_pharaon',
        password: 'pharaonPasswordPubgVip',
        loginMethod: 'Riot Games/Riot/FB'
      },
      pubgInfo: {
        outfitCount: 140,
        gunSkinCount: 82,
        vehicleSkinCount: 15,
        uc: 2400,
        rareItems: ['Pharaon Cấp 6 (MAX)', 'M416 Băng Giá Cấp 7 (MAX)', 'Lamborghini Thể Thao Vàng']
      },
      warrantyDays: 60,
      status: 'available'
    });

    console.log('Seeded Game Accounts successfully.');

    // 4. Create Collections
    const colSale = await Collection.create({
      name: 'Nick Siêu Khuyến Mãi ⚡',
      slug: 'nick-sieu-khuyen-mai',
      description: 'Tổng hợp tài khoản game xả kho cực rẻ cho học sinh sinh viên.',
      image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1470&auto=format&fit=crop',
      gameAccounts: [accLQ1._id, accFF1._id, accLOL1._id]
    });

    const colVip = await Collection.create({
      name: 'Nick VIP Cực Phẩm 💎',
      slug: 'nick-vip-cuc-pham',
      description: 'Những tài khoản đắt giá nhất sở hữu trang phục độc nhất vô nhị.',
      image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1470&auto=format&fit=crop',
      gameAccounts: [accLQ2._id, accLOL2._id, accPUBG2._id]
    });

    console.log('Seeded Collections successfully.');

    // 5. Create Coupons
    await Coupon.create({
      code: 'GAME10',
      name: 'Giảm 10% tổng đơn hàng',
      discountType: 'percent',
      discountValue: 10,
      minOrderValue: 100000,
      maxDiscount: 50000, // max 50k
      usageLimit: 100,
      perUserLimit: 1,
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true
    });

    await Coupon.create({
      code: 'NICK50K',
      name: 'Giảm ngay 50.000đ cho đơn đầu tiên',
      discountType: 'fixed',
      discountValue: 50000,
      minOrderValue: 200000,
      usageLimit: 50,
      perUserLimit: 1,
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true
    });

    await Coupon.create({
      code: 'LQSALE',
      name: 'Ưu đãi đặc biệt giảm 20%',
      discountType: 'percent',
      discountValue: 20,
      minOrderValue: 500000,
      maxDiscount: 200000,
      usageLimit: 30,
      perUserLimit: 1,
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true
    });

    console.log('Seeded Coupons successfully.');

    // 6. Create Default SiteSetting
    await SiteSetting.create({
      logo: '/images/logo.png',
      bannerImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1470&auto=format&fit=crop',
      bannerTitle: 'Hệ thống mua bán Nick Game uy tín hàng đầu',
      bannerSubtitle: 'Giao dịch tự động - Bảo mật tuyệt đối - Support 24/7',
      contactPhone: '0988888888',
      contactEmail: 'support@gamenick.com',
      address: '123 Đường Cầu Giấy, Hà Nội, Việt Nam',
      facebookUrl: 'https://facebook.com/gamenick_store',
      youtubeUrl: 'https://youtube.com/gamenick_store',
      bankInfo: {
        ownerName: 'NGUYEN KIM HIEN',
        bankName: 'MBBank',
        accountNumber: '999999999999',
        qrTemplate: 'https://img.vietqr.io/image/MBBank-999999999999-compact.jpg?amount={amount}&addInfo={addInfo}'
      },
      momoInfo: {
        ownerName: 'NGUYEN KIM HIEN',
        phoneNumber: '0988888888',
        qrTemplate: ''
      }
    });

    console.log('Seeded SiteSetting successfully.');

    // 7. Create Orders
    // Account to purchase
    const accLQ_Sold = await GameAccount.create({
      code: 'LQ003',
      name: 'Nick Liên Quân Đã Bán Mẫu (Thử Nghiệm)',
      slug: 'nick-lien-quan-da-ban-mau-thu-nghiem',
      gameType: 'lien_quan',
      category: catLienQuan._id,
      images: [],
      price: 150000,
      description: 'Nick đã bán phục vụ test hiển thị credentials.',
      rank: 'Tinh Anh V',
      level: '30',
      server: 'Việt Nam',
      loginInfo: {
        username: 'test_sold_username',
        password: 'passSoldTest123',
        loginMethod: 'Garena'
      },
      status: 'sold',
      soldAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
    });

    // Completed Order
    await Order.create({
      orderCode: 'ORD-260530-X1A2',
      user: user1._id,
      customerInfo: {
        fullName: 'Nguyễn Khánh Nam',
        phone: '0912345678',
        email: 'namkhank@gmail.com',
        note: 'Giao hàng nhanh giúp em nhé.'
      },
      items: [{
        accountId: accLQ_Sold._id,
        code: accLQ_Sold.code,
        name: accLQ_Sold.name,
        gameType: accLQ_Sold.gameType,
        image: '',
        price: accLQ_Sold.price,
        subtotal: accLQ_Sold.price,
        deliveredCredentials: {
          username: accLQ_Sold.loginInfo.username,
          password: accLQ_Sold.loginInfo.password,
          loginMethod: accLQ_Sold.loginInfo.loginMethod || 'Garena',
          linkedEmail: accLQ_Sold.loginInfo.linkedEmail || '',
          securityNote: accLQ_Sold.loginInfo.securityNote || ''
        }
      }],
      subtotal: 150000,
      discountAmount: 0,
      total: 150000,
      paymentMethod: 'balance',
      paymentStatus: 'paid',
      orderStatus: 'completed',
      deliveredAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
    });

    // Account for pending order
    const accLQ_Reserved = await GameAccount.create({
      code: 'LQ004',
      name: 'Nick Liên Quân Đang Test Đơn Chờ Thanh Toán',
      slug: 'nick-lien-quan-dang-test-don-cho-thanh-toan',
      gameType: 'lien_quan',
      category: catLienQuan._id,
      images: [],
      price: 300000,
      description: 'Phục vụ cự ly test chuyển khoản và up ảnh proof.',
      rank: 'Cao Thủ',
      level: '30',
      server: 'Việt Nam',
      loginInfo: {
        username: 'test_reserved_username',
        password: 'passReservedTest123'
      },
      status: 'reserved',
      reservedUntil: new Date(Date.now() + 15 * 60 * 1000)
    });

    // Pending payment Order
    await Order.create({
      orderCode: 'ORD-260530-X1A3',
      user: user2._id,
      customerInfo: {
        fullName: 'Trần Minh Đức',
        phone: '0934567890',
        email: 'ductran@gmail.com',
        note: ''
      },
      items: [{
        accountId: accLQ_Reserved._id,
        code: accLQ_Reserved.code,
        name: accLQ_Reserved.name,
        gameType: accLQ_Reserved.gameType,
        image: '',
        price: accLQ_Reserved.price,
        subtotal: accLQ_Reserved.price,
        deliveredCredentials: {
          username: accLQ_Reserved.loginInfo.username,
          password: accLQ_Reserved.loginInfo.password,
          loginMethod: accLQ_Reserved.loginInfo.loginMethod || 'Garena',
          linkedEmail: accLQ_Reserved.loginInfo.linkedEmail || '',
          securityNote: accLQ_Reserved.loginInfo.securityNote || ''
        }
      }],
      subtotal: 300000,
      discountAmount: 0,
      total: 300000,
      paymentMethod: 'bank_transfer',
      paymentStatus: 'unpaid',
      orderStatus: 'pending_payment'
    });

    console.log('Seeded sample Orders successfully.');

    await mongoose.connection.close();
    console.log('Seeding process completed. Connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed with error:', error);
    process.exit(1);
  }
};

seedData();
