(function () {
  const titles = {
    dashboard: ['Dashboard', 'Tổng quan hoạt động MMO và trạng thái quản lý.'],
    accounts: ['Quản lý tài khoản', 'Admin tài khoản, nền tảng, niche, điểm tin cậy và trạng thái.'],
    content: ['Quản lý nội dung', 'Lịch đăng bài, caption, link affiliate và trạng thái duyệt.'],
    comments: ['Quản lý bình luận', 'Thư viện mẫu phản hồi thủ công theo ngữ cảnh.'],
    affiliate: ['Quản lý affiliate', 'Offer, network, doanh thu, chi phí, conversion và ROI.'],
    tools: ['Quản lý công cụ', 'Danh mục các công cụ trong hệ thống MMO.'],
    reports: ['Báo cáo', 'Tổng hợp hiệu quả và việc cần xử lý.']
  };
  const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
  let data = emptyData();

  function emptyData() {
    return { accounts: [], content: [], comments: [], aff: [], tools: [] };
  }

  function $(id) {
    return document.getElementById(id);
  }

  function uid() {
    if (window.crypto && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `mmo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function num(value) {
    return Number(value) || 0;
  }

  function lower(value) {
    return String(value || '').toLowerCase();
  }

  function pct(value) {
    return `${value.toFixed(1).replace('.0', '')}%`;
  }

  function request(action, payload) {
    const body = new URLSearchParams();
    body.set('action', action);
    body.set('nonce', MMOAdminTools.nonce);
    if (payload) {
      body.set('payload', JSON.stringify(payload));
    }

    return fetch(MMOAdminTools.ajaxUrl, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    }).then((response) => response.json());
  }

  function save() {
    return request('mmo_admin_tools_save', data).then((result) => {
      if (!result.success) {
        throw new Error(result.data && result.data.message ? result.data.message : 'Không lưu được dữ liệu.');
      }
      data = Object.assign(emptyData(), result.data);
      renderAll();
      notice('Đã lưu dữ liệu.');
    }).catch((error) => notice(error.message, true));
  }

  function notice(text, error) {
    const box = $('mmo-notice');
    box.textContent = text;
    box.style.borderLeftColor = error ? '#b42318' : '#147d78';
    box.hidden = false;
    clearTimeout(notice.timer);
    notice.timer = setTimeout(() => { box.hidden = true; }, 1800);
  }

  function fillSelect(id, values, label) {
    const select = $(id);
    const current = select.value;
    select.innerHTML = `<option value="">${label}</option>`;
    [...new Set(values.filter(Boolean))].sort().forEach((value) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
    select.value = [...select.options].some((option) => option.value === current) ? current : '';
  }

  function setPage(page) {
    document.querySelectorAll('.mmo-page').forEach((section) => section.classList.toggle('active', section.id === page));
    document.querySelectorAll('.mmo-nav button').forEach((button) => button.classList.toggle('active', button.dataset.page === page));
    $('mmo-page-title').textContent = titles[page][0];
    $('mmo-page-desc').textContent = titles[page][1];
  }

  function renderStats() {
    const pending = data.content.filter((item) => item.status !== 'Đã đăng').length;
    const revenue = data.aff.reduce((sum, item) => sum + num(item.revenue), 0);
    const cost = data.aff.reduce((sum, item) => sum + num(item.cost), 0);
    const profit = revenue - cost;
    $('stat-accounts').textContent = data.accounts.length;
    $('stat-content').textContent = pending;
    $('stat-aff').textContent = data.aff.length;
    $('stat-profit').textContent = money.format(profit);
    $('report-revenue').textContent = money.format(revenue);
    $('report-cost').textContent = money.format(cost);
    $('risk-count').textContent = data.accounts.filter((item) => item.status === 'Rủi ro').length;
    $('pending-count').textContent = data.content.filter((item) => item.status === 'Chờ duyệt').length;
  }

  function actionCell(collection, itemId) {
    return `<div class="mmo-row-actions"><button class="danger" type="button" data-collection="${collection}" data-id="${itemId}">Xóa</button></div>`;
  }

  function renderAccounts() {
    fillSelect('account-platform-filter', data.accounts.map((item) => item.platform), 'Tất cả nền tảng');
    const q = lower($('account-search').value);
    const platform = $('account-platform-filter').value;
    const status = $('account-status-filter').value;
    const rows = data.accounts.filter((item) => (!q || lower(`${item.name} ${item.platform} ${item.niche}`).includes(q)) && (!platform || item.platform === platform) && (!status || item.status === status));
    $('account-rows').innerHTML = rows.map((item) => {
      const scoreClass = item.score >= 70 ? 'green' : item.score < 40 ? 'red' : 'amber';
      return `<tr><td><strong>${escapeHtml(item.name)}</strong></td><td>${escapeHtml(item.platform)}</td><td>${escapeHtml(item.niche || '-')}</td><td><span class="mmo-pill ${scoreClass}">${item.score}/100</span></td><td>${escapeHtml(item.status)}</td><td>${escapeHtml(item.note || '-')}</td><td>${actionCell('accounts', item.id)}</td></tr>`;
    }).join('');
  }

  function renderContent() {
    fillSelect('content-platform-filter', data.content.map((item) => item.platform), 'Tất cả nền tảng');
    const q = lower($('content-search').value);
    const platform = $('content-platform-filter').value;
    const status = $('content-status-filter').value;
    const rows = data.content.filter((item) => (!q || lower(`${item.title} ${item.note}`).includes(q)) && (!platform || item.platform === platform) && (!status || item.status === status));
    $('content-rows').innerHTML = rows.map((item) => `<tr><td><strong>${escapeHtml(item.title)}</strong></td><td>${escapeHtml(item.platform)}</td><td>${escapeHtml(item.date || '-')}</td><td>${escapeHtml(item.status)}</td><td>${escapeHtml(item.link || '-')}</td><td>${actionCell('content', item.id)}</td></tr>`).join('');
  }

  function renderComments() {
    fillSelect('comment-context-filter', data.comments.map((item) => item.context), 'Tất cả ngữ cảnh');
    fillSelect('comment-tag-filter', data.comments.map((item) => item.tag), 'Tất cả tag');
    const q = lower($('comment-search').value);
    const context = $('comment-context-filter').value;
    const tag = $('comment-tag-filter').value;
    const rows = data.comments.filter((item) => (!q || lower(`${item.text} ${item.tag}`).includes(q)) && (!context || item.context === context) && (!tag || item.tag === tag));
    $('comment-rows').innerHTML = rows.map((item) => `<tr><td>${escapeHtml(item.text)}</td><td>${escapeHtml(item.context)}</td><td>${escapeHtml(item.tag || '-')}</td><td><div class="mmo-row-actions"><button type="button" data-copy="${escapeAttr(item.text)}">Copy</button><button class="danger" type="button" data-collection="comments" data-id="${item.id}">Xóa</button></div></td></tr>`).join('');
  }

  function renderAff() {
    $('aff-rows').innerHTML = data.aff.map((item) => {
      const profit = num(item.revenue) - num(item.cost);
      const roi = item.cost ? profit / num(item.cost) * 100 : item.revenue ? 100 : 0;
      const cvr = item.clicks ? num(item.conversions) / num(item.clicks) * 100 : 0;
      return `<tr><td><strong>${escapeHtml(item.offer)}</strong></td><td>${escapeHtml(item.network)}</td><td>${money.format(item.revenue)}</td><td>${money.format(item.cost)}</td><td>${money.format(profit)}</td><td>${pct(roi)}</td><td>${pct(cvr)}</td><td>${actionCell('aff', item.id)}</td></tr>`;
    }).join('');
  }

  function renderTools() {
    $('tool-cards').innerHTML = data.tools.length ? data.tools.map((tool) => `<article class="mmo-card"><h2>${escapeHtml(tool.name)}</h2><p>${escapeHtml(tool.desc)}</p><p><span class="mmo-pill green">${escapeHtml(tool.status)}</span></p><div class="mmo-row-actions"><button class="danger" type="button" data-collection="tools" data-id="${tool.id}">Xóa</button></div></article>`).join('') : '<div class="mmo-card"><p>Chưa có công cụ.</p></div>';
  }

  function renderAll() {
    renderStats();
    renderAccounts();
    renderContent();
    renderComments();
    renderAff();
    renderTools();
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, '&#096;');
  }

  function today(offset) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return date.toISOString().slice(0, 10);
  }

  document.addEventListener('click', (event) => {
    const nav = event.target.closest('.mmo-nav button');
    if (nav) setPage(nav.dataset.page);

    const del = event.target.closest('[data-collection][data-id]');
    if (del && confirm('Xóa mục này?')) {
      data[del.dataset.collection] = data[del.dataset.collection].filter((item) => item.id !== del.dataset.id);
      save();
    }

    const copy = event.target.closest('[data-copy]');
    if (copy) {
      navigator.clipboard.writeText(copy.dataset.copy);
      notice('Đã copy mẫu bình luận.');
    }
  });

  $('account-form').addEventListener('submit', (event) => {
    event.preventDefault();
    data.accounts.unshift({ id: uid(), name: $('account-name').value.trim(), platform: $('account-platform').value, niche: $('account-niche').value.trim(), status: $('account-status').value, score: Math.max(0, Math.min(100, num($('account-score').value))), note: $('account-note').value.trim() });
    event.target.reset();
    $('account-score').value = 50;
    save();
  });

  $('content-form').addEventListener('submit', (event) => {
    event.preventDefault();
    data.content.unshift({ id: uid(), title: $('content-title').value.trim(), platform: $('content-platform').value, date: $('content-date').value, status: $('content-status').value, link: $('content-link').value.trim(), note: $('content-note').value.trim() });
    event.target.reset();
    save();
  });

  $('comment-form').addEventListener('submit', (event) => {
    event.preventDefault();
    data.comments.unshift({ id: uid(), context: $('comment-context').value, tag: $('comment-tag').value.trim(), text: $('comment-text').value.trim() });
    event.target.reset();
    save();
  });

  $('aff-form').addEventListener('submit', (event) => {
    event.preventDefault();
    data.aff.unshift({ id: uid(), offer: $('aff-offer').value.trim(), network: $('aff-network').value, revenue: num($('aff-revenue').value), cost: num($('aff-cost').value), clicks: num($('aff-clicks').value), conversions: num($('aff-conversions').value), link: $('aff-link').value.trim() });
    event.target.reset();
    $('aff-revenue').value = 0;
    $('aff-cost').value = 0;
    $('aff-clicks').value = 0;
    $('aff-conversions').value = 0;
    save();
  });

  ['account-search', 'account-platform-filter', 'account-status-filter'].forEach((id) => $(id).addEventListener('input', renderAccounts));
  ['content-search', 'content-platform-filter', 'content-status-filter'].forEach((id) => $(id).addEventListener('input', renderContent));
  ['comment-search', 'comment-context-filter', 'comment-tag-filter'].forEach((id) => $(id).addEventListener('input', renderComments));

  $('tool-add').addEventListener('click', () => {
    data.tools.unshift({ id: uid(), name: 'Tool quản lý MMO', desc: 'Module quản lý workflow, tài khoản, nội dung và affiliate.', status: 'Hoạt động' });
    save();
  });

  $('mmo-seed').addEventListener('click', () => {
    data = {
      accounts: [
        { id: uid(), name: 'TikTok Review 01', platform: 'TikTok', niche: 'Gia dụng', status: 'Đang chạy', score: 82, note: 'Đăng video 20:00' },
        { id: uid(), name: 'Fanpage Deal VN', platform: 'Facebook', niche: 'Deal hot', status: 'Rủi ro', score: 38, note: 'Rà soát tần suất đăng' }
      ],
      content: [
        { id: uid(), title: 'Top 5 máy xay mini', platform: 'TikTok', date: today(1), status: 'Sẵn sàng', link: 'https://example.com/aff/may-xay', note: 'Hook giá dưới 300k' },
        { id: uid(), title: 'So sánh hosting WordPress', platform: 'Blog SEO', date: today(3), status: 'Chờ duyệt', link: 'https://example.com/aff/hosting', note: 'Keyword hosting wordpress' }
      ],
      comments: [
        { id: uid(), context: 'Hỏi giá', tag: 'Gia dụng', text: 'Giá thường thay đổi theo mã giảm và shop. Bạn kiểm tra link hiện tại trước khi mua nhé.' }
      ],
      aff: [
        { id: uid(), offer: 'Máy xay mini', network: 'Shopee', revenue: 4200000, cost: 900000, clicks: 3200, conversions: 64, link: 'https://example.com/aff/may-xay' }
      ],
      tools: [
        { id: uid(), name: 'Account Manager', desc: 'Quản lý tài khoản, trạng thái và điểm tin cậy.', status: 'Hoạt động' },
        { id: uid(), name: 'Affiliate Tracker', desc: 'Theo dõi doanh thu, chi phí và ROI.', status: 'Hoạt động' }
      ]
    };
    save();
  });

  $('mmo-export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'mmo-admin-tools-data.json';
    link.click();
    URL.revokeObjectURL(link.href);
  });

  $('mmo-clear').addEventListener('click', () => {
    if (!confirm('Xóa toàn bộ dữ liệu MMO Admin?')) return;
    data = emptyData();
    save();
  });

  request('mmo_admin_tools_load').then((result) => {
    if (!result.success) {
      throw new Error(result.data && result.data.message ? result.data.message : 'Không tải được dữ liệu.');
    }
    data = Object.assign(emptyData(), result.data);
    renderAll();
  }).catch((error) => notice(error.message, true));
})();
