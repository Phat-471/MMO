<?php
/**
 * Plugin Name: MMO Admin Tools
 * Description: Admin panel for managing MMO accounts, content, comments, affiliate offers, tools, and reports.
 * Version: 0.1.0
 * Author: Local
 */

if (!defined('ABSPATH')) {
    exit;
}

final class MMO_Admin_Tools {
    private const OPTION_KEY = 'mmo_admin_tools_data';
    private const NONCE_ACTION = 'mmo_admin_tools_nonce';

    public function __construct() {
        add_action('admin_menu', [$this, 'register_menu']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_assets']);
        add_action('wp_ajax_mmo_admin_tools_load', [$this, 'ajax_load']);
        add_action('wp_ajax_mmo_admin_tools_save', [$this, 'ajax_save']);
    }

    public function register_menu(): void {
        add_menu_page(
            'MMO Admin',
            'MMO Admin',
            'manage_options',
            'mmo-admin-tools',
            [$this, 'render_page'],
            'dashicons-chart-area',
            56
        );
    }

    public function enqueue_assets(string $hook): void {
        if ($hook !== 'toplevel_page_mmo-admin-tools') {
            return;
        }

        $base_url = plugin_dir_url(__FILE__);
        $version = '0.1.0';

        wp_enqueue_style('mmo-admin-tools', $base_url . 'assets/admin.css', [], $version);
        wp_enqueue_script('mmo-admin-tools', $base_url . 'assets/admin.js', [], $version, true);
        wp_localize_script('mmo-admin-tools', 'MMOAdminTools', [
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce(self::NONCE_ACTION),
        ]);
    }

    public function render_page(): void {
        if (!current_user_can('manage_options')) {
            wp_die(esc_html__('You do not have permission to access this page.', 'mmo-admin-tools'));
        }
        ?>
        <div class="mmo-admin" id="mmo-admin-app">
            <aside class="mmo-sidebar">
                <div class="mmo-brand">
                    <div class="mmo-brand-mark">MMO</div>
                    <div>
                        <div class="mmo-brand-title">Admin Tools</div>
                        <div class="mmo-brand-sub">WordPress manager</div>
                    </div>
                </div>
                <nav class="mmo-nav" aria-label="MMO Admin">
                    <button class="active" type="button" data-page="dashboard">Dashboard</button>
                    <button type="button" data-page="accounts">Tài khoản</button>
                    <button type="button" data-page="content">Nội dung</button>
                    <button type="button" data-page="comments">Bình luận</button>
                    <button type="button" data-page="affiliate">Affiliate</button>
                    <button type="button" data-page="tools">Công cụ</button>
                    <button type="button" data-page="reports">Báo cáo</button>
                </nav>
                <div class="mmo-side-note">Dữ liệu lưu trong WordPress option, chỉ admin có quyền quản lý mới truy cập được.</div>
            </aside>

            <main class="mmo-main">
                <div class="mmo-topbar">
                    <div>
                        <h1 id="mmo-page-title">Dashboard</h1>
                        <p id="mmo-page-desc">Tổng quan hoạt động MMO và trạng thái quản lý.</p>
                    </div>
                    <div class="mmo-actions">
                        <button class="mmo-btn secondary" type="button" id="mmo-seed">Dữ liệu mẫu</button>
                        <button class="mmo-btn secondary" type="button" id="mmo-export">Xuất JSON</button>
                        <button class="mmo-btn danger" type="button" id="mmo-clear">Xóa dữ liệu</button>
                    </div>
                </div>

                <div class="mmo-notice" id="mmo-notice" hidden></div>

                <section class="mmo-page active" id="dashboard">
                    <div class="mmo-stats">
                        <div class="mmo-stat"><span>Tài khoản</span><strong id="stat-accounts">0</strong></div>
                        <div class="mmo-stat"><span>Bài chờ đăng</span><strong id="stat-content">0</strong></div>
                        <div class="mmo-stat"><span>Offer affiliate</span><strong id="stat-aff">0</strong></div>
                        <div class="mmo-stat"><span>Lợi nhuận</span><strong id="stat-profit">0 đ</strong></div>
                    </div>
                    <div class="mmo-grid three">
                        <article class="mmo-card"><h2>Quản lý tài khoản</h2><p>Trạng thái, nền tảng, niche, điểm tin cậy và ghi chú vận hành.</p></article>
                        <article class="mmo-card"><h2>Quản lý nội dung</h2><p>Lịch đăng bài, caption, link affiliate và trạng thái duyệt.</p></article>
                        <article class="mmo-card"><h2>Affiliate tracker</h2><p>Offer, network, click, conversion, doanh thu, chi phí và ROI.</p></article>
                    </div>
                </section>

                <section class="mmo-page" id="accounts">
                    <div class="mmo-panel">
                        <h2>Thêm tài khoản</h2>
                        <form id="account-form" class="mmo-form">
                            <label>Tên tài khoản<input id="account-name" required maxlength="80"></label>
                            <label>Nền tảng<select id="account-platform"><option>TikTok</option><option>Facebook</option><option>YouTube</option><option>Instagram</option><option>Website</option><option>Email</option><option>Khác</option></select></label>
                            <label>Niche<input id="account-niche" maxlength="80"></label>
                            <label>Trạng thái<select id="account-status"><option>Đang nuôi</option><option>Đang chạy</option><option>Tạm dừng</option><option>Rủi ro</option></select></label>
                            <label>Điểm<input id="account-score" type="number" min="0" max="100" value="50"></label>
                            <label class="wide">Ghi chú<input id="account-note" maxlength="160"></label>
                            <button class="mmo-btn primary" type="submit">Lưu tài khoản</button>
                        </form>
                    </div>
                    <div class="mmo-panel">
                        <div class="mmo-filter"><input id="account-search" placeholder="Tìm tài khoản"><select id="account-platform-filter"><option value="">Tất cả nền tảng</option></select><select id="account-status-filter"><option value="">Tất cả trạng thái</option><option>Đang nuôi</option><option>Đang chạy</option><option>Tạm dừng</option><option>Rủi ro</option></select></div>
                        <div class="mmo-table-wrap"><table><thead><tr><th>Tài khoản</th><th>Nền tảng</th><th>Niche</th><th>Điểm</th><th>Trạng thái</th><th>Ghi chú</th><th></th></tr></thead><tbody id="account-rows"></tbody></table></div>
                    </div>
                </section>

                <section class="mmo-page" id="content">
                    <div class="mmo-panel">
                        <h2>Thêm nội dung</h2>
                        <form id="content-form" class="mmo-form">
                            <label>Tiêu đề<input id="content-title" required maxlength="120"></label>
                            <label>Nền tảng<select id="content-platform"><option>TikTok</option><option>Facebook</option><option>YouTube</option><option>Instagram</option><option>Blog SEO</option><option>Email</option></select></label>
                            <label>Ngày đăng<input id="content-date" type="date"></label>
                            <label>Trạng thái<select id="content-status"><option>Ý tưởng</option><option>Đang viết</option><option>Chờ duyệt</option><option>Sẵn sàng</option><option>Đã đăng</option></select></label>
                            <label class="wide">Link affiliate<input id="content-link" maxlength="240"></label>
                            <label class="full">Caption / ghi chú<textarea id="content-note" maxlength="600"></textarea></label>
                            <button class="mmo-btn primary" type="submit">Lưu nội dung</button>
                        </form>
                    </div>
                    <div class="mmo-panel">
                        <div class="mmo-filter"><input id="content-search" placeholder="Tìm nội dung"><select id="content-platform-filter"><option value="">Tất cả nền tảng</option></select><select id="content-status-filter"><option value="">Tất cả trạng thái</option><option>Ý tưởng</option><option>Đang viết</option><option>Chờ duyệt</option><option>Sẵn sàng</option><option>Đã đăng</option></select></div>
                        <div class="mmo-table-wrap"><table><thead><tr><th>Nội dung</th><th>Nền tảng</th><th>Ngày</th><th>Trạng thái</th><th>Link</th><th></th></tr></thead><tbody id="content-rows"></tbody></table></div>
                    </div>
                </section>

                <section class="mmo-page" id="comments">
                    <div class="mmo-panel">
                        <h2>Thêm mẫu bình luận</h2>
                        <form id="comment-form" class="mmo-form">
                            <label>Ngữ cảnh<select id="comment-context"><option>Hỏi giá</option><option>Hỏi tính năng</option><option>So sánh</option><option>Phản hồi tích cực</option><option>Xử lý nghi ngại</option><option>CTA mềm</option></select></label>
                            <label>Tag<input id="comment-tag" maxlength="60"></label>
                            <label class="full">Nội dung<textarea id="comment-text" required maxlength="500"></textarea></label>
                            <button class="mmo-btn primary" type="submit">Lưu mẫu</button>
                        </form>
                    </div>
                    <div class="mmo-panel">
                        <div class="mmo-filter"><input id="comment-search" placeholder="Tìm mẫu"><select id="comment-context-filter"><option value="">Tất cả ngữ cảnh</option></select><select id="comment-tag-filter"><option value="">Tất cả tag</option></select></div>
                        <div class="mmo-table-wrap"><table><thead><tr><th>Nội dung</th><th>Ngữ cảnh</th><th>Tag</th><th></th></tr></thead><tbody id="comment-rows"></tbody></table></div>
                    </div>
                </section>

                <section class="mmo-page" id="affiliate">
                    <div class="mmo-panel">
                        <h2>Thêm offer affiliate</h2>
                        <form id="aff-form" class="mmo-form">
                            <label>Offer<input id="aff-offer" required maxlength="100"></label>
                            <label>Network<select id="aff-network"><option>Shopee</option><option>Lazada</option><option>Amazon</option><option>ClickBank</option><option>Accesstrade</option><option>Khác</option></select></label>
                            <label>Doanh thu<input id="aff-revenue" type="number" min="0" step="1000" value="0"></label>
                            <label>Chi phí<input id="aff-cost" type="number" min="0" step="1000" value="0"></label>
                            <label>Click<input id="aff-clicks" type="number" min="0" value="0"></label>
                            <label>Conversion<input id="aff-conversions" type="number" min="0" value="0"></label>
                            <label class="wide">Link<input id="aff-link" maxlength="240"></label>
                            <button class="mmo-btn primary" type="submit">Lưu offer</button>
                        </form>
                    </div>
                    <div class="mmo-panel">
                        <div class="mmo-table-wrap"><table><thead><tr><th>Offer</th><th>Network</th><th>Doanh thu</th><th>Chi phí</th><th>Lợi nhuận</th><th>ROI</th><th>CVR</th><th></th></tr></thead><tbody id="aff-rows"></tbody></table></div>
                    </div>
                </section>

                <section class="mmo-page" id="tools">
                    <div class="mmo-panel">
                        <div class="mmo-panel-head"><h2>Công cụ</h2><button class="mmo-btn primary" type="button" id="tool-add">Thêm tool mẫu</button></div>
                        <div class="mmo-grid three" id="tool-cards"></div>
                    </div>
                </section>

                <section class="mmo-page" id="reports">
                    <div class="mmo-grid two">
                        <div class="mmo-panel"><h2>Báo cáo tài chính</h2><div class="mmo-stats two"><div class="mmo-stat"><span>Doanh thu</span><strong id="report-revenue">0 đ</strong></div><div class="mmo-stat"><span>Chi phí</span><strong id="report-cost">0 đ</strong></div></div></div>
                        <div class="mmo-panel"><h2>Việc cần chú ý</h2><div class="mmo-list"><div><strong id="risk-count">0</strong><span>Tài khoản rủi ro</span></div><div><strong id="pending-count">0</strong><span>Nội dung chờ duyệt</span></div></div></div>
                    </div>
                </section>
            </main>
        </div>
        <?php
    }

    public function ajax_load(): void {
        $this->verify_request();
        wp_send_json_success($this->get_data());
    }

    public function ajax_save(): void {
        $this->verify_request();
        $raw = isset($_POST['payload']) ? wp_unslash($_POST['payload']) : '';
        $decoded = json_decode($raw, true);

        if (!is_array($decoded)) {
            wp_send_json_error(['message' => 'Invalid payload.'], 400);
        }

        update_option(self::OPTION_KEY, $this->sanitize_data($decoded), false);
        wp_send_json_success($this->get_data());
    }

    private function verify_request(): void {
        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Permission denied.'], 403);
        }

        check_ajax_referer(self::NONCE_ACTION, 'nonce');
    }

    private function get_data(): array {
        $data = get_option(self::OPTION_KEY, []);
        return is_array($data) ? array_merge($this->empty_data(), $data) : $this->empty_data();
    }

    private function empty_data(): array {
        return [
            'accounts' => [],
            'content' => [],
            'comments' => [],
            'aff' => [],
            'tools' => [],
        ];
    }

    private function sanitize_data(array $data): array {
        $clean = $this->empty_data();

        foreach ((array) ($data['accounts'] ?? []) as $item) {
            $clean['accounts'][] = [
                'id' => sanitize_key($item['id'] ?? ''),
                'name' => sanitize_text_field($item['name'] ?? ''),
                'platform' => sanitize_text_field($item['platform'] ?? ''),
                'niche' => sanitize_text_field($item['niche'] ?? ''),
                'status' => sanitize_text_field($item['status'] ?? ''),
                'score' => max(0, min(100, absint($item['score'] ?? 0))),
                'note' => sanitize_text_field($item['note'] ?? ''),
            ];
        }

        foreach ((array) ($data['content'] ?? []) as $item) {
            $clean['content'][] = [
                'id' => sanitize_key($item['id'] ?? ''),
                'title' => sanitize_text_field($item['title'] ?? ''),
                'platform' => sanitize_text_field($item['platform'] ?? ''),
                'date' => sanitize_text_field($item['date'] ?? ''),
                'status' => sanitize_text_field($item['status'] ?? ''),
                'link' => esc_url_raw($item['link'] ?? ''),
                'note' => sanitize_textarea_field($item['note'] ?? ''),
            ];
        }

        foreach ((array) ($data['comments'] ?? []) as $item) {
            $clean['comments'][] = [
                'id' => sanitize_key($item['id'] ?? ''),
                'context' => sanitize_text_field($item['context'] ?? ''),
                'tag' => sanitize_text_field($item['tag'] ?? ''),
                'text' => sanitize_textarea_field($item['text'] ?? ''),
            ];
        }

        foreach ((array) ($data['aff'] ?? []) as $item) {
            $clean['aff'][] = [
                'id' => sanitize_key($item['id'] ?? ''),
                'offer' => sanitize_text_field($item['offer'] ?? ''),
                'network' => sanitize_text_field($item['network'] ?? ''),
                'revenue' => (float) ($item['revenue'] ?? 0),
                'cost' => (float) ($item['cost'] ?? 0),
                'clicks' => absint($item['clicks'] ?? 0),
                'conversions' => absint($item['conversions'] ?? 0),
                'link' => esc_url_raw($item['link'] ?? ''),
            ];
        }

        foreach ((array) ($data['tools'] ?? []) as $item) {
            $clean['tools'][] = [
                'id' => sanitize_key($item['id'] ?? ''),
                'name' => sanitize_text_field($item['name'] ?? ''),
                'desc' => sanitize_textarea_field($item['desc'] ?? ''),
                'status' => sanitize_text_field($item['status'] ?? ''),
            ];
        }

        return $clean;
    }
}

new MMO_Admin_Tools();
