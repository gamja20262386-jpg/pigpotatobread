// Registered User Database & Current Active Session
        let registeredUsers = []; // Stores signup records
        let currentUser = null;
        let cart = [];
        let orderHistory = []; // Initialized EMPTY as requested
        let isPickupMode = false;

        // Real Famous Jeju Restaurants Data with Images
        const famousStores = [
            {
                name: '연돈 (제주본점)',
                rating: '4.9',
                reviewCount: 3420,
                time: '25~35분',
                category: '돈까스·일식',
                deliveryFee: '2,000원',
                img: 'https://images.unsplash.com/photo-1591814468924-caf88d1232e1?w=300&auto=format&fit=crop&q=80',
                items: [
                    { name: '수제 등심돈까스', price: 11000, desc: '바삭함이 살아있는 제주 흑돼지 등심', img: 'https://images.unsplash.com/photo-1591814468924-caf88d1232e1?w=150&auto=format&fit=crop&q=80' },
                    { name: '수제 치즈돈까스', price: 13000, desc: '모짜렐라 치즈가 가득한 대표 메뉴', img: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=150&auto=format&fit=crop&q=80' },
                    { name: '수제 카레', price: 4000, desc: '깊은 풍미의 특제 사이드 카레', img: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=150&auto=format&fit=crop&q=80' }
                ]
            },
            {
                name: '숙성도 (노형본점)',
                rating: '4.8',
                reviewCount: 2890,
                time: '30~40분',
                category: '흑돼지·구이',
                deliveryFee: '3,000원',
                img: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&auto=format&fit=crop&q=80',
                items: [
                    { name: '숙성 흑돼지 뼈목살 (2인)', price: 38000, desc: '특허받은 교차 숙성 흑돼지 구이', img: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=150&auto=format&fit=crop&q=80' },
                    { name: '숙성 삼겹살 구이세트', price: 22000, desc: '육즙 가득 직화 삼겹살', img: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=150&auto=format&fit=crop&q=80' },
                    { name: '갈치속젓 볶음밥', price: 8000, desc: '감칠맛 나는 짭조름한 대표 볶음밥', img: 'https://images.unsplash.com/photo-1596560548464-f010549b84d7?w=150&auto=format&fit=crop&q=80' }
                ]
            },
            {
                name: '우진해장국',
                rating: '4.9',
                reviewCount: 4100,
                time: '20~30분',
                category: '제주향토·해장국',
                deliveryFee: '2,000원',
                img: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=300&auto=format&fit=crop&q=80',
                items: [
                    { name: '고사리육개장', price: 10000, desc: '제주산 고사리를 잘게 찢어 넣은 진한 육개장', img: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=150&auto=format&fit=crop&q=80' },
                    { name: '몸국', price: 10000, desc: '모자반과 돼지고기를 넣어 끓인 제주 향토 음식', img: 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=150&auto=format&fit=crop&q=80' },
                    { name: '사골해장국', price: 10000, desc: '얼큰하고 시원한 사골 뼈해장국', img: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=150&auto=format&fit=crop&q=80' }
                ]
            },
            {
                name: '올래국수',
                rating: '4.7',
                reviewCount: 1980,
                time: '15~25분',
                category: '분식·국수',
                deliveryFee: '2,000원',
                img: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=300&auto=format&fit=crop&q=80',
                items: [
                    { name: '제주 고기국수', price: 9000, desc: '두툼한 흑돼지 수육이 듬뿍 들어간 진한 국수', img: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=150&auto=format&fit=crop&q=80' }
                ]
            },
            {
                name: '제주김만복 (본점)',
                rating: '4.6',
                reviewCount: 2150,
                time: '20~30분',
                category: '분식·국수',
                deliveryFee: '2,500원',
                img: 'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=300&auto=format&fit=crop&q=80',
                items: [
                    { name: '만복이네 전복김밥', price: 8500, desc: '전복내장 밥과 계란지단이 잘 어우러진 김밥', img: 'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=150&auto=format&fit=crop&q=80' },
                    { name: '오징어무침', price: 5500, desc: '김밥과 환상궁합 별미 오징어무침', img: 'https://images.unsplash.com/photo-1596560548464-f010549b84d7?w=150&auto=format&fit=crop&q=80' }
                ]
            }
        ];

        // Raw Ingredients & Grocery Items Data with Images
        const groceryItems = [
            { name: '제주 흑돼지 생오겹살 (500g)', price: 18500, unit: '냉장', img: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=200&auto=format&fit=crop&q=80' },
            { name: '제주 생은갈치 (대 1마리)', price: 24000, unit: '당일포획', img: 'https://images.unsplash.com/photo-1534482421-64566f976cfa?w=200&auto=format&fit=crop&q=80' },
            { name: '제주 흙당근 (1kg)', price: 4500, unit: '구좌읍 산지', img: 'https://images.unsplash.com/photo-1598170845058-12ef4a457939?w=200&auto=format&fit=crop&q=80' },
            { name: '제주 삼다수 (2L x 6병)', price: 5800, unit: '무료배송', img: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=200&auto=format&fit=crop&q=80' },
            { name: '제주 노지감귤 (3kg)', price: 12900, unit: '고당도', img: 'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=200&auto=format&fit=crop&q=80' },
            { name: '제주 오메기떡 (10개입)', price: 11000, unit: '수제', img: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=200&auto=format&fit=crop&q=80' }
        ];

        // Render Famous Restaurants on Home
        function renderFamousRestaurants() {
            const container = document.getElementById('famous-restaurants-list');
            container.innerHTML = famousStores.map(store => `
                <div onclick="openStoreDetail('${store.name}')" class="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-3 cursor-pointer hover:border-orange-300 transition">
                    <img src="${store.img}" alt="${store.name}" class="w-16 h-16 rounded-xl object-cover flex-shrink-0">
                    <div class="flex-1">
                        <div class="flex items-center space-x-1.5">
                            <h3 class="font-bold text-sm text-gray-900">${store.name}</h3>
                            <span class="text-xs text-amber-500 font-bold"><i class="fa-solid fa-star text-[10px]"></i> ${store.rating}</span>
                        </div>
                        <p class="text-xs text-gray-500 mt-0.5">${store.category} • 배달 ${store.time}</p>
                    </div>
                    <span class="text-xs bg-orange-100 text-jejuOrange font-bold px-2.5 py-1 rounded-lg flex-shrink-0">메뉴 보기</span>
                </div>
            `).join('');
        }

        // Render Grocery Items on Home
        function renderGroceryItems() {
            const container = document.getElementById('grocery-items-grid');
            container.innerHTML = groceryItems.map((item, idx) => `
                <div class="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between overflow-hidden">
                    <div>
                        <img src="${item.img}" alt="${item.name}" class="w-full h-24 object-cover rounded-xl mb-2">
                        <span class="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">${item.unit}</span>
                        <h4 class="font-bold text-xs text-gray-800 mt-1">${item.name}</h4>
                    </div>
                    <div class="mt-2 flex justify-between items-center">
                        <span class="font-extrabold text-sm text-gray-900">${item.price.toLocaleString()}원</span>
                        <button onclick="addGroceryToCart(${idx})" class="w-7 h-7 bg-jejuOrange text-white rounded-lg flex items-center justify-center hover:bg-jejuOrangeDark shadow-sm">
                            <i class="fa-solid fa-plus text-xs"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        }

        // Address Handlers
        function openAddressModal() {
            document.getElementById('address-modal').classList.remove('hidden');
        }
        function closeAddressModal() {
            document.getElementById('address-modal').classList.add('hidden');
        }
        function setLabelPreset(label) {
            document.getElementById('input-address-label').value = label;
        }
        function saveNewAddress() {
            const roadAddr = document.getElementById('input-road-address').value.trim();
            const label = document.getElementById('input-address-label').value.trim() || '지정 배송지';

            if (!roadAddr) {
                showToast('도로명 주소를 입력해주세요.');
                return;
            }

            document.getElementById('current-address-label').innerText = label;
            document.getElementById('current-address-text').innerText = roadAddr;
            if (currentUser) currentUser.address = `${label} (${roadAddr})`;
            closeAddressModal();
            showToast(`배송지가 [${label}] (으)로 변경되었습니다.`);
        }

        // Auth Tabs & Handlers
        function openAuthModal() {
            document.getElementById('auth-modal').classList.remove('hidden');
            updateAuthUI();
        }
        function closeAuthModal() {
            document.getElementById('auth-modal').classList.add('hidden');
        }
        function switchAuthTab(tab) {
            const loginBtn = document.getElementById('auth-tab-login');
            const signupBtn = document.getElementById('auth-tab-signup');
            const loginForm = document.getElementById('login-form-container');
            const signupForm = document.getElementById('signup-form-container');

            if (tab === 'login') {
                loginBtn.className = "flex-1 py-2 font-bold text-sm text-jejuOrange border-b-2 border-jejuOrange";
                signupBtn.className = "flex-1 py-2 font-bold text-sm text-gray-400";
                loginForm.classList.remove('hidden');
                signupForm.classList.add('hidden');
            } else {
                signupBtn.className = "flex-1 py-2 font-bold text-sm text-jejuOrange border-b-2 border-jejuOrange";
                loginBtn.className = "flex-1 py-2 font-bold text-sm text-gray-400";
                signupForm.classList.remove('hidden');
                loginForm.classList.add('hidden');
            }
        }
        function handleSignup() {
            const name = document.getElementById('signup-name').value.trim();
            const phone = document.getElementById('signup-id').value.trim();
            const pw = document.getElementById('signup-pw').value.trim();

            if (!name || !phone || !pw) {
                showToast('이름, 아이디(휴대폰 번호), 비밀번호를 모두 입력해주세요.');
                return;
            }

            const existing = registeredUsers.find(u => u.phone === phone);
            if (existing) {
                showToast('이미 가입된 아이디(전화번호)입니다. 로그인해 주세요.');
                switchAuthTab('login');
                return;
            }

            registeredUsers.push({ name, phone, pw });
            showToast('회원가입이 완료되었습니다! 로그인해 주세요.');
            switchAuthTab('login');
            document.getElementById('login-id').value = phone;
        }
        function handleLogin() {
            const phone = document.getElementById('login-id').value.trim();
            const pw = document.getElementById('login-pw').value.trim();

            if (!phone || !pw) {
                showToast('아이디와 비밀번호를 모두 입력해주세요.');
                return;
            }

            const user = registeredUsers.find(u => u.phone === phone && u.pw === pw);

            if (!user) {
                showToast('아이디나 비밀번호가 다릅니다. 다시 시도해 주세요.');
                return;
            }

            currentUser = { ...user };
            updateAuthUI();
            showToast(`${currentUser.name}님 환영합니다! (로그인 완료)`);
        }
        function handleLogout() {
            currentUser = null;
            updateAuthUI();
            showToast('로그아웃 되었습니다.');
        }
        function updateAuthUI() {
            const tabBar = document.getElementById('auth-tab-bar');
            const loginForm = document.getElementById('login-form-container');
            const signupForm = document.getElementById('signup-form-container');
            const profileContainer = document.getElementById('profile-container');
            const title = document.getElementById('auth-modal-title');

            if (currentUser) {
                tabBar.classList.add('hidden');
                loginForm.classList.add('hidden');
                signupForm.classList.add('hidden');
                profileContainer.classList.remove('hidden');
                title.innerText = '마이페이지';

                document.getElementById('profile-display-name').innerText = `${currentUser.name} 도민 회원님`;
                document.getElementById('profile-display-phone').innerText = currentUser.phone;
                
                document.getElementById('info-view-name').innerText = currentUser.name;
                document.getElementById('info-view-phone').innerText = currentUser.phone;
                document.getElementById('info-view-addr').innerText = currentUser.address || document.getElementById('current-address-text').innerText;
                
                document.getElementById('edit-name').value = currentUser.name;
                document.getElementById('edit-phone').value = currentUser.phone;
                document.getElementById('edit-pw').value = '';
                
                document.getElementById('profile-view-mode').classList.remove('hidden');
                document.getElementById('profile-edit-mode').classList.add('hidden');
                document.getElementById('btn-edit-toggle').innerText = "수정하기";
            } else {
                tabBar.classList.remove('hidden');
                profileContainer.classList.add('hidden');
                title.innerText = '로그인 / 회원가입';
                switchAuthTab('login');
            }
        }
        function toggleProfileEditMode() {
            const viewMode = document.getElementById('profile-view-mode');
            const editMode = document.getElementById('profile-edit-mode');
            const btn = document.getElementById('btn-edit-toggle');

            if (editMode.classList.contains('hidden')) {
                viewMode.classList.add('hidden');
                editMode.classList.remove('hidden');
                btn.innerText = "취소";
            } else {
                viewMode.classList.remove('hidden');
                editMode.classList.add('hidden');
                btn.innerText = "수정하기";
            }
        }
        function saveProfileEdit() {
            if (!currentUser) return;
            const newName = document.getElementById('edit-name').value.trim();
            const newPhone = document.getElementById('edit-phone').value.trim();
            const newPw = document.getElementById('edit-pw').value.trim();

            if (newName && newPhone) {
                currentUser.name = newName;
                currentUser.phone = newPhone;
                if (newPw) currentUser.pw = newPw;

                // Sync registered database record
                const regIdx = registeredUsers.findIndex(u => u.phone === currentUser.phone);
                if (regIdx !== -1) registeredUsers[regIdx] = { ...currentUser };

                updateAuthUI();
                showToast('회원 정보가 성공적으로 수정되었습니다.');
            }
        }

        // Category & Store Handlers
        function openCategoryModal(catName, specificStoreName = null, pickup = false, searchQuery = '') {
            isPickupMode = Boolean(pickup);
            const modal = document.getElementById('category-modal');
            const title = document.getElementById('category-modal-title');
            const container = document.getElementById('store-list-container');

            title.innerText = `🍊 ${catName} 카테고리`;
            
            const normalizedQuery = String(searchQuery || '').trim().toLowerCase();
            const filteredStores = specificStoreName
                ? famousStores.filter(s => s.name === specificStoreName)
                : normalizedQuery
                    ? famousStores.filter(s => {
                        const searchable = [s.name, s.category, ...(s.items || []).flatMap(item => [item.name, item.desc || ''])].join(' ').toLowerCase();
                        return searchable.includes(normalizedQuery);
                    })
                    : famousStores.filter(s => s.category === catName || catName === '전체');
            const displayStores = filteredStores.length > 0 ? filteredStores : famousStores;
            if (normalizedQuery && filteredStores.length === 0) {
                showToast('정확히 일치하는 메뉴가 없어 전체 매장을 보여드려요.');
            }

            container.innerHTML = displayStores.map(store => `
                <div class="border border-gray-100 rounded-2xl p-4 bg-white shadow-sm space-y-3">
                    <div class="flex space-x-3 items-center">
                        <img src="${store.img}" class="w-16 h-16 rounded-xl object-cover">
                        <div>
                            <h4 class="font-bold text-base text-gray-900">${store.name}</h4>
                            <p class="text-xs text-amber-500 font-bold"><i class="fa-solid fa-star"></i> ${store.rating} (${store.reviewCount})</p>
                            <span class="text-[10px] bg-orange-100 text-jejuOrange font-bold px-2 py-0.5 rounded-md">배달 ${store.time}</span>
                        </div>
                    </div>

                    <div class="divide-y divide-gray-50 pt-1">
                        ${store.items.map(item => `
                            <div class="py-2.5 flex items-center justify-between">
                                <div class="flex items-center space-x-2.5">
                                    <img src="${item.img}" class="w-12 h-12 rounded-lg object-cover">
                                    <div>
                                        <p class="text-xs font-bold text-gray-800">${item.name}</p>
                                        <p class="text-[10px] text-gray-400">${item.desc || ''}</p>
                                        <p class="text-xs font-extrabold text-jejuOrange mt-0.5">${item.price.toLocaleString()}원</p>
                                    </div>
                                </div>
                                <button onclick="addToCart('${store.name}', '${item.name}', ${item.price})" class="bg-jejuOrange hover:bg-jejuOrangeDark text-white font-bold text-xs px-3 py-1.5 rounded-xl transition shadow-sm">
                                    + 담기
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('');

            modal.classList.remove('hidden');
        }

        // Pickup Handlers
        function openPickupModal() {
            const modal = document.getElementById('pickup-modal');
            const container = document.getElementById('pickup-store-list');

            container.innerHTML = famousStores.map(store => `
                <div class="border border-gray-100 rounded-2xl p-4 bg-white shadow-sm space-y-3">
                    <div class="flex justify-between items-center">
                        <div class="flex space-x-3 items-center">
                            <img src="${store.img}" class="w-14 h-14 rounded-xl object-cover">
                            <div>
                                <h4 class="font-bold text-sm text-gray-900">${store.name}</h4>
                                <p class="text-[11px] text-gray-500">📍 도보 5~10분 거리</p>
                                <span class="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">픽업 소요 15분</span>
                            </div>
                        </div>
                        <button onclick="selectPickupStore('${store.name}')" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 rounded-xl">
                            포장주문
                        </button>
                    </div>
                </div>
            `).join('');

            modal.classList.remove('hidden');
        }

        function closePickupModal() {
            document.getElementById('pickup-modal').classList.add('hidden');
        }

        function selectPickupStore(storeName) {
            closePickupModal();
            isPickupMode = true;
            const store = famousStores.find(s => s.name === storeName);
            if (store) openCategoryModal(store.category, storeName, true);
            showToast(`[${storeName}] 포장·픽업 주문 모드로 선택되었습니다.`);
        }

        function openStoreDetail(storeName) {
            const store = famousStores.find(s => s.name === storeName);
            if (store) {
                openCategoryModal(store.category, storeName, false);
            }
        }
        function closeCategoryModal() {
            document.getElementById('category-modal').classList.add('hidden');
        }

        // Cart Handlers (Auto Navigate to Cart on item add)
        function addToCart(store, itemName, price) {
            // 여러 매장 상품은 함께 담을 수 있지만 배달과 포장은 한 장바구니에 섞지 않습니다.
            if (cart.length > 0 && cart.some(item => item.isPickup !== isPickupMode)) {
                showToast("배달 상품과 포장·픽업 상품은 함께 담을 수 없습니다. 장바구니를 먼저 비워주세요.");
                return;
            }
            const existing = cart.find(i => i.store === store && i.name === itemName && i.isPickup === isPickupMode);
            if (existing) existing.quantity++;
            else cart.push({ store, name: itemName, price, quantity: 1, isPickup: isPickupMode });
            closeCategoryModal();
            updateCartUI();
            document.getElementById('cart-modal').classList.remove('hidden');
            showToast(`[${itemName}] 이 장바구니에 담겼습니다.`);
        }
        function addGroceryToCart(index) {
            const item = groceryItems[index];
            isPickupMode = false;
            addToCart('제주 장보기 (식자재)', item.name, item.price);
        }
        function getCartGroups() {
            const groups = new Map();
            cart.forEach(item => {
                if (!groups.has(item.store)) groups.set(item.store, []);
                groups.get(item.store).push(item);
            });
            return [...groups.entries()].map(([store, items]) => ({ store, items,
                subtotal: items.reduce((sum, item) => sum + item.price * item.quantity, 0) }));
        }
        function getStoreDeliveryFee(storeName) {
            if (storeName === '제주 장보기 (식자재)') return 2000;
            const store = famousStores.find(item => item.name === storeName);
            const feeText = store && store.deliveryFee ? String(store.deliveryFee) : '2,000원';
            const fee = Number(feeText.replace(/[^0-9]/g, ''));
            return Number.isFinite(fee) && fee > 0 ? fee : 2000;
        }
        function getCartDeliveryFee() {
            if (!cart.length || cart[0].isPickup) return 0;
            return getCartGroups().reduce((sum, group) => sum + getStoreDeliveryFee(group.store), 0);
        }

        function updateCartUI() {
            const cartBadge = document.getElementById('cart-badge');
            const floatingBar = document.getElementById('floating-cart-bar');
            const floatingCount = document.getElementById('floating-cart-count');
            const floatingTotal = document.getElementById('floating-cart-total');
            const modalContainer = document.getElementById('cart-items-container');
            const modalTotal = document.getElementById('cart-modal-total-price');
            const orderTypeLabel = document.getElementById('cart-order-type-label');
            const deliveryFeeLabel = document.getElementById('cart-modal-delivery-fee');

            const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);
            const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
            const pickup = cart.length > 0 && cart[0].isPickup;
            const deliveryFee = getCartDeliveryFee();
            if (orderTypeLabel) orderTypeLabel.innerText = pickup ? '포장 · 픽업' : '매장별 배달';
            if (deliveryFeeLabel) deliveryFeeLabel.innerText = `${deliveryFee.toLocaleString()}원`;
            if (totalItems > 0) {
                cartBadge.innerText = totalItems;
                cartBadge.classList.remove('hidden');
                floatingBar.classList.remove('hidden');
                floatingCount.innerText = `${totalItems}개`;
                floatingTotal.innerText = `${(subtotal + deliveryFee).toLocaleString()}원`;
            } else {
                cartBadge.classList.add('hidden');
                floatingBar.classList.add('hidden');
            }
            modalTotal.innerText = `${(subtotal + deliveryFee).toLocaleString()}원`;

            if (cart.length === 0) {
                modalContainer.innerHTML = `<p class="text-center text-xs text-gray-400 py-8">장바구니가 비어 있습니다.</p>`;
                closeAgentPreview();
                return;
            }
            modalContainer.innerHTML = getCartGroups().map(group => `
                <section class="py-2">
                    <div class="flex justify-between items-center bg-gray-50 rounded-lg px-2.5 py-2 mb-1">
                        <strong class="text-xs text-gray-800">${group.store}</strong>
                        <span class="text-[11px] text-gray-500">소계 ${group.subtotal.toLocaleString()}원</span>
                    </div>
                    ${group.items.map(item => {
                        const idx = cart.indexOf(item);
                        return `<div class="py-2.5 flex justify-between items-center">
                            <div><p class="text-xs font-bold text-gray-900">${item.name} ${item.isPickup ? '<span class="text-[10px] text-emerald-600">[포장]</span>' : ''}</p>
                            <p class="text-xs text-jejuOrange font-extrabold">${(item.price * item.quantity).toLocaleString()}원</p></div>
                            <div class="flex items-center space-x-2 border rounded-lg px-2 py-1">
                                <button onclick="changeQty(${idx}, -1)" class="text-gray-500 font-bold px-1">-</button>
                                <span class="text-xs font-bold">${item.quantity}</span>
                                <button onclick="changeQty(${idx}, 1)" class="text-gray-500 font-bold px-1">+</button>
                            </div></div>`;
                    }).join('')}
                </section>`).join('');
        }
        function changeQty(index, delta) {
            cart[index].quantity += delta;
            if (cart[index].quantity <= 0) {
                cart.splice(index, 1);
            }
            updateCartUI();
        }
        function toggleCartModal() {
            const modal = document.getElementById('cart-modal');
            modal.classList.toggle('hidden');
        }
        function checkout() {
            if (cart.length === 0) {
                showToast("장바구니가 비어 있습니다.");
                return;
            }
            const pickup = cart[0].isPickup;
            if (cart.some(item => item.isPickup !== pickup)) {
                showToast("배달과 포장 상품은 한 주문에 함께 담을 수 없습니다.");
                return;
            }
            const groups = getCartGroups();
            groups.forEach((group, index) => {
                const deliveryFee = pickup ? 0 : getStoreDeliveryFee(group.store);
                orderHistory.unshift({
                    id: `ORD-${Date.now().toString().slice(-6)}-${index + 1}`,
                    date: new Date().toLocaleString('ko-KR', { hour12: false }),
                    store: group.store,
                    items: group.items.map(item => ({ ...item })),
                    subtotal: group.subtotal,
                    deliveryFee,
                    total: group.subtotal + deliveryFee,
                    status: pickup ? '주문 접수 (포장/픽업 대기중 · 결제 미연동)' : '주문 접수 (배달 준비중 · 결제 미연동)'
                });
            });
            cart = [];
            isPickupMode = false;
            updateCartUI();
            document.getElementById('cart-modal').classList.add('hidden');
            openOrdersModal();
            showToast(`${groups.length}개 매장의 테스트 주문이 주문 내역에 추가되었습니다.`);
        }

        // Order History Modal Handlers
        function openOrdersModal() {
            const modal = document.getElementById('orders-modal');
            const container = document.getElementById('orders-list-container');

            if (orderHistory.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-12">
                        <i class="fa-solid fa-clipboard-list text-4xl text-gray-300 mb-2"></i>
                        <p class="text-xs text-gray-500 font-bold">주문 내역이 없습니다.</p>
                        <p class="text-[11px] text-gray-400 mt-1">원하는 맛집이나 식자재를 담고 주문해보세요!</p>
                    </div>
                `;
            } else {
                container.innerHTML = orderHistory.map(order => `
                    <div class="border border-gray-100 rounded-2xl p-4 bg-white shadow-sm space-y-3">
                        <div class="flex justify-between items-start border-b pb-2">
                            <div>
                                <span class="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">${order.status}</span>
                                <h4 class="font-bold text-sm text-gray-900 mt-1">${order.store}</h4>
                                <p class="text-[10px] text-gray-400">${order.date} (주문번호: ${order.id})</p>
                            </div>
                        </div>

                        <!-- Individual items breakdown -->
                        <div class="space-y-1.5 pt-1 border-b pb-2">
                            ${order.items.map(item => `
                                <div class="flex justify-between text-xs text-gray-700">
                                    <span>${item.name} <span class="text-gray-400">× ${item.quantity}</span></span>
                                    <span class="font-bold">${(item.price * item.quantity).toLocaleString()}원</span>
                                </div>
                            `).join('')}
                        </div>

                        <!-- Price calculation total breakdown -->
                        <div class="space-y-1 text-xs text-gray-500 pt-1">
                            <div class="flex justify-between">
                                <span>상품 금액</span>
                                <span>${order.subtotal.toLocaleString()}원</span>
                            </div>
                            <div class="flex justify-between">
                                <span>배달 팁</span>
                                <span>${order.deliveryFee.toLocaleString()}원</span>
                            </div>
                            <div class="flex justify-between font-black text-sm text-gray-900 pt-1 border-t">
                                <span>총 결제금액</span>
                                <span class="text-jejuOrange">${order.total.toLocaleString()}원</span>
                            </div>
                        </div>
                    </div>
                `).join('');
            }

            modal.classList.remove('hidden');
        }
        function closeOrdersModal() {
            document.getElementById('orders-modal').classList.add('hidden');
        }

        // Agent-style recommendation demo: suggestions are derived from cart contents.
        let currentAgentSuggestions = [];
        function buildAgentSuggestions() {
            const names = cart.map(item => item.name).join(' ').toLowerCase();
            const candidates = [];
            if (/흑돼지|삼겹살|목살|오겹살/.test(names)) {
                candidates.push({ store: '제주 장보기 (식자재)', name: '제주 흙당근 (1kg)', price: 4500, reason: '고기와 함께 곁들이기 좋은 제주 농산물' });
                candidates.push({ store: '제주 장보기 (식자재)', name: '제주 노지감귤 (3kg)', price: 12900, reason: '식사 후 디저트로 추천' });
            } else if (/국수|육개장|해장국|몸국/.test(names)) {
                candidates.push({ store: '제주 장보기 (식자재)', name: '제주 삼다수 (2L x 6병)', price: 5800, reason: '식사와 함께 준비하기 좋은 생수' });
                candidates.push({ store: '제주 장보기 (식자재)', name: '제주 오메기떡 (10개입)', price: 11000, reason: '제주식 후식 추천' });
            } else {
                candidates.push({ store: '제주 장보기 (식자재)', name: '제주 노지감귤 (3kg)', price: 12900, reason: '제주 대표 과일을 함께 즐겨보세요' });
                candidates.push({ store: '제주 장보기 (식자재)', name: '제주 흙당근 (1kg)', price: 4500, reason: '신선한 제주 농산물 추천' });
            }
            return candidates.filter(candidate => !cart.some(item => item.store === candidate.store && item.name === candidate.name));
        }
        function openAgentPreview() {
            if (!cart.length) { showToast('먼저 상품을 장바구니에 담아주세요.'); return; }
            if (cart[0].isPickup) {
                showToast('포장 주문에는 장보기 상품 추천을 적용할 수 없습니다.'); return;
            }
            currentAgentSuggestions = buildAgentSuggestions();
            const panel = document.getElementById('agent-preview');
            const list = document.getElementById('agent-suggestion-list');
            if (!currentAgentSuggestions.length) {
                list.innerHTML = '<p class="text-xs text-gray-500">새롭게 추천할 상품이 없습니다.</p>';
            } else {
                list.innerHTML = currentAgentSuggestions.map((item, index) => `
                    <label class="flex items-start gap-2 bg-white rounded-lg p-2 text-xs">
                        <input type="checkbox" class="agent-suggestion-check mt-0.5" value="${index}" checked>
                        <span class="flex-1"><strong>${item.name}</strong><br><span class="text-gray-500">${item.reason}</span></span>
                        <b class="text-jejuOrange whitespace-nowrap">${item.price.toLocaleString()}원</b>
                    </label>`).join('');
            }
            panel.classList.remove('hidden');
        }
        function closeAgentPreview() {
            const panel = document.getElementById('agent-preview');
            if (panel) panel.classList.add('hidden');
        }
        function applyAgentSuggestions() {
            const selected = [...document.querySelectorAll('.agent-suggestion-check:checked')]
                .map(input => currentAgentSuggestions[Number(input.value)]).filter(Boolean);
            if (!selected.length) { showToast('적용할 추천 상품을 선택해주세요.'); return; }
            selected.forEach(item => {
                const existing = cart.find(cartItem => cartItem.store === item.store && cartItem.name === item.name && !cartItem.isPickup);
                if (existing) existing.quantity++;
                else cart.push({ store: item.store, name: item.name, price: item.price, quantity: 1, isPickup: false });
            });
            updateCartUI();
            closeAgentPreview();
            showToast(`${selected.length}개 추천 상품을 장바구니에 적용했습니다.`);
        }

        // Navigation Tabs Handling
        function switchTab(tab) {
            const navs = ['home', 'shopping', 'orders', 'my'];
            navs.forEach(t => {
                const el = document.getElementById(`nav-${t}`);                if (el) el.className = "flex flex-col items-center text-gray-400 hover:text-gray-700";
            });

            const activeNav = document.getElementById(`nav-${tab}`);
            if (activeNav) activeNav.className = "flex flex-col items-center text-jejuOrange font-bold";

            if (tab === 'orders') openOrdersModal();
            else if (tab === 'my') openAuthModal();
            else if (tab === 'shopping') document.getElementById('section-grocery').scrollIntoView({ behavior: 'smooth' });
            else if (tab === 'home') window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        function scrollToSection(id) {
            document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
        }

        // AI Search
        function performAISearch() {
            const input = document.getElementById('search-input');
            const query = input ? input.value.trim() : '';
            if (!query) {
                showToast('검색어나 먹고 싶은 메뉴를 입력해주세요!');
                return;
            }
            showToast(`🤖 '${query}' 관련 제주 맛집과 메뉴를 찾고 있어요.`);
            openCategoryModal(`'${query}' 추천 검색 결과`, null, false, query);
        }

        // Toast Message Utility
        let toastTimeout;
        function showToast(msg) {
            const toast = document.getElementById('toast');
            const toastMsg = document.getElementById('toast-message');
            toastMsg.innerText = msg;

            toast.classList.remove('opacity-0', 'pointer-events-none');
            toast.classList.add('opacity-100');

            clearTimeout(toastTimeout);
            toastTimeout = setTimeout(() => {
                toast.classList.remove('opacity-100');
                toast.classList.add('opacity-0', 'pointer-events-none');
            }, 2500);
        }

        // 이미지가 외부 서버 문제로 로드되지 않을 때 표시할 공통 대체 이미지
        // 캡처 단계에서 처리하므로 메뉴/장보기/장바구니 등 동적으로 생성되는 이미지에도 적용됩니다.
        document.addEventListener('error', function(event) {
            const img = event.target;
            if (!img || img.tagName !== 'IMG' || img.dataset.fallbackApplied === 'true') return;

            img.dataset.fallbackApplied = 'true';
            const fallbackSvg = `
                <svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
                    <defs>
                        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0" stop-color="#fff7ed"/>
                            <stop offset="1" stop-color="#ffedd5"/>
                        </linearGradient>
                    </defs>
                    <rect width="640" height="420" fill="url(#bg)"/>
                    <circle cx="320" cy="190" r="112" fill="#ffffff" stroke="#fdba74" stroke-width="12"/>
                    <circle cx="320" cy="190" r="78" fill="#fff7ed" stroke="#fed7aa" stroke-width="8"/>
                    <path d="M280 190c18-28 62-28 80 0-18 34-62 34-80 0z" fill="#fb923c" opacity=".85"/>
                    <circle cx="294" cy="174" r="9" fill="#65a30d"/>
                    <circle cx="344" cy="205" r="8" fill="#65a30d"/>
                    <text x="320" y="350" text-anchor="middle" font-family="Arial,sans-serif" font-size="25" font-weight="700" fill="#9a3412">제주잇</text>
                </svg>`;
            img.src = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(fallbackSvg);
            img.alt = img.alt || '이미지를 불러올 수 없습니다';
        }, true);

        // Initialization
        window.onload = function() {
            renderFamousRestaurants();
            renderGroceryItems();
            updateCartUI();
        };