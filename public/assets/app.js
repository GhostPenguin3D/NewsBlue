const icons = () => window.lucide?.createIcons();

document.addEventListener("DOMContentLoaded", () => {
  icons();
  initNavigation();
  initSchoolFinder();
  initArticleFilters();
  initArticleManagement();
  initCommunity();
  initQuestionThread();
  initSheets();
});

function initNavigation() {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".nav-links");
  if (!toggle || !nav) return;
  toggle.addEventListener("click", () => {
    const expanded = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(expanded));
    toggle.setAttribute("aria-label", expanded ? "ปิดเมนู" : "เปิดเมนู");
    toggle.innerHTML = `<i data-lucide="${expanded ? "x" : "menu"}"></i>`;
    icons();
  });
  nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
    nav.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.innerHTML = '<i data-lucide="menu"></i>';
    icons();
  }));
}

async function initSchoolFinder() {
  const container = document.getElementById("school-results");
  if (!container) return;
  const count = document.getElementById("result-count");
  const search = document.getElementById("school-search");
  const districtFilter = document.getElementById("school-district");
  const programFilter = document.getElementById("school-program-filter");
  const pagination = document.getElementById("school-pagination");
  let schools = [];
  let programsBySchool = {};
  let metadata = {};
  let currentPage = 1;
  const pageSize = 24;
  try {
    const [response, plansResponse] = await Promise.all([
      fetch("./data/schools.json"),
      fetch("./data/school-programs.json")
    ]);
    if (!response.ok || !plansResponse.ok) throw new Error("Unable to load school data");
    const [directory, plans] = await Promise.all([response.json(), plansResponse.json()]);
    schools = directory.schools;
    metadata = directory.metadata;
    programsBySchool = plans.bySchoolId || {};
    if (!Array.isArray(schools) || !Array.isArray(directory.districts)) throw new Error("Invalid school directory");
    directory.districts.forEach((district) => {
      const option = document.createElement("option");
      option.value = district.name;
      option.textContent = district.name;
      districtFilter.append(option);
    });
    const availablePrograms = new Set(Object.values(programsBySchool).flatMap((record) => record.programs.map((program) => program.name)));
    [...availablePrograms].sort((a, b) => a.localeCompare(b, "th")).forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      programFilter.append(option);
    });
  } catch {
    count.textContent = "โหลดรายชื่อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
    container.innerHTML = '<div class="empty-state">ไม่สามารถโหลดข้อมูลโรงเรียนได้ในขณะนี้</div>';
    return;
  }
  const render = () => {
    const term = search.value.trim().toLocaleLowerCase("th");
    const selectedDistrict = districtFilter.value;
    const selectedProgram = programFilter.value;
    const filtered = schools.filter((school) => {
      const plans = programsBySchool[school.id]?.programs || [];
      const searchText = `${school.name} ${school.district} ${plans.map((program) => program.name).join(" ")}`.toLocaleLowerCase("th");
      return searchText.includes(term) && (selectedDistrict === "all" || school.district === selectedDistrict) && (selectedProgram === "all" || plans.some((program) => program.name === selectedProgram));
    });
    const pageCount = Math.ceil(filtered.length / pageSize);
    currentPage = Math.min(Math.max(currentPage, 1), Math.max(pageCount, 1));
    count.textContent = `พบ ${filtered.length.toLocaleString("th-TH")} โรงเรียน จาก ${metadata.districtCount.toLocaleString("th-TH")} เขตพื้นที่`;
    container.replaceChildren();
    pagination.replaceChildren();
    if (!filtered.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "ไม่พบโรงเรียน ลองค้นด้วยชื่อหรือจังหวัดอื่น";
      container.append(empty);
      return;
    }
    filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize).forEach((school) => {
      const card = document.createElement("article");
      card.className = "school-card";
      const top = document.createElement("div");
      top.className = "school-top";
      top.innerHTML = '<span class="school-emblem"><i data-lucide="school"></i></span><span class="verified-label"><i data-lucide="database"></i> ข้อมูลจากต้นทาง</span>';
      const title = document.createElement("h2");
      title.textContent = school.name;
      const location = document.createElement("p");
      location.className = "school-location";
      location.innerHTML = '<i data-lucide="map-pin"></i> ';
      location.append(document.createTextNode(school.district));
      const info = document.createElement("p");
      info.className = "school-info";
      info.textContent = `นักเรียน ${school.students.toLocaleString("th-TH")} คน · ชาย ${school.male.toLocaleString("th-TH")} · หญิง ${school.female.toLocaleString("th-TH")} · ${school.classrooms.toLocaleString("th-TH")} ห้อง`;
      const planRecord = programsBySchool[school.id];
      let planSection;
      if (planRecord?.programs?.length) {
        planSection = document.createElement("div");
        planSection.className = "school-programs";
        const planHeading = document.createElement("strong");
        planHeading.textContent = `แผนการเรียน ปี ${planRecord.academicYear}`;
        planSection.append(planHeading);
        const planList = document.createElement("ul");
        planRecord.programs.forEach((program) => {
          const item = document.createElement("li");
          item.textContent = `${program.name} · รับ ${program.seats.toLocaleString("th-TH")} คน`;
          planList.append(item);
        });
        const source = document.createElement("a");
        source.href = planRecord.sourceUrl;
        source.target = "_blank";
        source.rel = "noopener noreferrer";
        source.textContent = `ประกาศปี ${planRecord.academicYear} · ${planRecord.sourceTitle}`;
        planSection.append(planList, source);
      }
      const source = document.createElement("a");
      source.className = "school-source";
      source.href = school.sourceUrl;
      source.target = "_blank";
      source.rel = "noopener noreferrer";
      source.append(document.createTextNode("ดูรายละเอียดต้นทาง "));
      const arrow = document.createElement("i");
      arrow.dataset.lucide = "arrow-up-right";
      source.append(arrow);
      const checked = document.createElement("span");
      checked.className = "school-checked";
      checked.textContent = `รหัสโรงเรียน ${school.id} · ข้อมูล ณ 10 มิ.ย. 2569`;
      card.append(top, title, location, info);
      if (planSection) card.append(planSection);
      card.append(source, checked);
      container.append(card);
    });
    renderSchoolPagination(pageCount);
    icons();
  };
  search.addEventListener("input", render);
  districtFilter.addEventListener("change", () => { currentPage = 1; render(); });
  programFilter.addEventListener("change", () => { currentPage = 1; render(); });
  document.getElementById("clear-school-search")?.addEventListener("click", () => {
    search.value = "";
    districtFilter.value = "all";
    programFilter.value = "all";
    currentPage = 1;
    render();
    search.focus();
  });
  render();

  function renderSchoolPagination(pageCount) {
    if (pageCount <= 1) return;
    const addButton = (label, page, options = {}) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "page-button";
      button.textContent = label;
      button.disabled = options.disabled ?? false;
      if (page === currentPage) button.setAttribute("aria-current", "page");
      button.setAttribute("aria-label", options.ariaLabel || `หน้า ${page}`);
      button.addEventListener("click", () => {
        currentPage = page;
        render();
        document.getElementById("school-finder").scrollIntoView({ behavior: "smooth" });
      });
      pagination.append(button);
    };
    addButton("ก่อนหน้า", Math.max(1, currentPage - 1), { disabled: currentPage === 1, ariaLabel: "หน้าก่อนหน้า" });
    const pages = [...new Set([1, currentPage - 1, currentPage, currentPage + 1, pageCount].filter((page) => page >= 1 && page <= pageCount))].sort((a, b) => a - b);
    let previous = 0;
    pages.forEach((page) => {
      if (previous && page - previous > 1) {
        const ellipsis = document.createElement("span");
        ellipsis.className = "page-ellipsis";
        ellipsis.textContent = "…";
        pagination.append(ellipsis);
      }
      addButton(String(page), page);
      previous = page;
    });
    addButton("ถัดไป", Math.min(pageCount, currentPage + 1), { disabled: currentPage === pageCount, ariaLabel: "หน้าถัดไป" });
  }
}

function initArticleFilters() {
  const filters = document.querySelectorAll("[data-article-filter]");
  if (!filters.length) return;
  filters.forEach((button) => button.addEventListener("click", () => {
    filters.forEach((item) => item.classList.toggle("active", item === button));
    document.querySelectorAll(".article-card[data-category]").forEach((card) => {
      card.hidden = button.dataset.articleFilter !== "all" && card.dataset.category !== button.dataset.articleFilter;
    });
  }));
}

async function initArticleManagement() {
  const container = document.getElementById("community-articles");
  if (!container) return;
  const panel = document.getElementById("article-admin-panel");
  const toggle = document.getElementById("article-admin-toggle");
  const tokenInput = document.getElementById("article-admin-token");
  const status = document.getElementById("article-admin-status");
  const count = document.getElementById("community-article-count");
  let published = [];

  const render = () => {
    container.replaceChildren();
    const activeFilter = document.querySelector("[data-article-filter].active")?.dataset.articleFilter || "all";
    const filtered = published.filter((article) => activeFilter === "all" || article.category === activeFilter);
    count.textContent = `${published.length} บทความ`;
    if (!filtered.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = published.length ? "ไม่มีบทความในหมวดนี้" : "ยังไม่มีบทความที่เพิ่มในระบบ";
      container.append(empty);
      return;
    }
    filtered.forEach((article) => {
      const card = document.createElement("article");
      card.className = "article-card";
      card.dataset.category = article.category;
      const art = document.createElement("div");
      art.className = "article-art community-article-art";
      const label = document.createElement("span");
      label.className = `tag ${article.category === "exam" ? "orange" : article.category === "mindset" ? "green" : ""}`;
      label.textContent = article.category === "exam" ? "เตรียมสอบ" : article.category === "mindset" ? "กำลังใจและประสบการณ์" : "เทคนิคอ่านหนังสือ";
      art.append(label);
      const body = document.createElement("div");
      body.className = "article-body";
      const title = document.createElement("h2");
      title.textContent = article.title;
      const excerpt = document.createElement("p");
      excerpt.textContent = article.excerpt || "บทความจากชุมชน ไปต่อ ม.ปลาย";
      const details = document.createElement("details");
      details.className = "article-detail";
      const summary = document.createElement("summary");
      summary.append(document.createTextNode("อ่านบทความ "));
      const chevron = document.createElement("i");
      chevron.dataset.lucide = "chevron-down";
      summary.append(chevron);
      const content = document.createElement("div");
      content.className = "community-article-content";
      content.textContent = article.body;
      details.append(summary, content);
      const meta = document.createElement("div");
      meta.className = "article-meta";
      const author = document.createElement("span");
      author.textContent = `${article.author} · ${formatThaiDate(article.created_at)}`;
      meta.append(author);
      const actions = document.createElement("div");
      actions.className = "article-admin-actions";
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "article-delete-button";
      deleteButton.dataset.deleteArticle = String(article.id);
      deleteButton.hidden = !tokenInput.value.trim();
      deleteButton.setAttribute("aria-label", `ลบบทความ ${article.title}`);
      deleteButton.innerHTML = '<i data-lucide="trash-2"></i> ลบบทความ';
      actions.append(deleteButton);
      body.append(title, excerpt, details, meta, actions);
      card.append(art, body);
      container.append(card);
    });
    icons();
  };

  const load = async () => {
    count.textContent = "กำลังโหลด";
    try {
      const response = await fetch("./api/articles");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "โหลดบทความไม่สำเร็จ");
      published = data.articles || [];
      render();
    } catch {
      count.textContent = "โหลดไม่สำเร็จ";
      container.innerHTML = '<p class="empty-state">ยังโหลดบทความจากระบบไม่ได้</p>';
    }
  };

  toggle.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    toggle.setAttribute("aria-expanded", String(!panel.hidden));
    if (!panel.hidden) tokenInput.focus();
  });
  document.getElementById("article-admin-close").addEventListener("click", () => {
    panel.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    tokenInput.value = "";
    render();
  });
  tokenInput.addEventListener("input", render);
  document.getElementById("article-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector("button[type=submit]");
    submit.disabled = true;
    status.textContent = "กำลังเผยแพร่";
    try {
      const response = await fetch("./api/articles", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${tokenInput.value}` },
        body: JSON.stringify({
          title: document.getElementById("article-title").value,
          excerpt: document.getElementById("article-excerpt").value,
          body: document.getElementById("article-body").value,
          category: document.getElementById("article-category").value,
          author: document.getElementById("article-author").value
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "เผยแพร่ไม่สำเร็จ");
      form.reset();
      status.textContent = "เผยแพร่แล้ว บทความอยู่ในรายการด้านล่าง";
      toast("เผยแพร่บทความแล้ว");
      await load();
      tokenInput.focus();
    } catch (error) {
      status.textContent = error.message || "เผยแพร่ไม่สำเร็จ";
    } finally {
      submit.disabled = false;
    }
  });
  container.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-delete-article]");
    if (!button || !window.confirm("ลบบทความนี้ออกจากระบบหรือไม่?")) return;
    button.disabled = true;
    try {
      const response = await fetch(`./api/articles?id=${encodeURIComponent(button.dataset.deleteArticle)}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${tokenInput.value}` }
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "ลบบทความไม่สำเร็จ");
      toast("ลบบทความแล้ว");
      await load();
    } catch (error) {
      toast(error.message || "ลบบทความไม่สำเร็จ");
      button.disabled = false;
    }
  });
  await load();
}

const toast = (message) => {
  const element = document.getElementById("toast");
  if (!element) return;
  element.textContent = message;
  element.classList.add("show");
  window.setTimeout(() => element.classList.remove("show"), 3000);
};

async function initCommunity() {
  const list = document.getElementById("question-items");
  if (!list) return;
  const status = document.getElementById("question-status");
  const load = async () => {
    status.textContent = "กำลังโหลดคำถาม";
    try {
      const response = await fetch("./api/questions");
      if (!response.ok) throw new Error("API unavailable");
      const data = await response.json();
      renderQuestions(list, data.questions || []);
      status.textContent = `${data.questions.length} คำถาม · อัปเดตล่าสุด`;
    } catch {
      list.innerHTML = '<div class="empty-state">ชุมชนจะพร้อมใช้งานหลังตั้งค่า Cloudflare D1 ตามคู่มือใน README</div>';
      status.textContent = "ยังเชื่อมต่อฐานข้อมูลไม่สำเร็จ";
    }
  };
  document.getElementById("refresh-questions")?.addEventListener("click", load);
  document.getElementById("question-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector("button[type=submit]");
    const question = document.getElementById("question-text").value.trim();
    const name = document.getElementById("question-name").value.trim();
    const honeypot = form.elements.website.value;
    submit.disabled = true;
    try {
      const response = await fetch("./api/questions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, question, website: honeypot })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "ส่งคำถามไม่สำเร็จ");
      form.reset();
      toast("ส่งคำถามแล้ว ขอบคุณที่ร่วมแบ่งปัน");
      await load();
    } catch (error) {
      toast(error.message || "ส่งคำถามไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      submit.disabled = false;
    }
  });
  await load();
}

async function initQuestionThread() {
  const questionCard = document.getElementById("thread-question");
  if (!questionCard) return;
  const questionId = Number(new URLSearchParams(window.location.search).get("id"));
  const status = document.getElementById("thread-status");
  const answers = document.getElementById("answer-list");
  const answerCount = document.getElementById("answer-count");
  const load = async () => {
    if (!Number.isSafeInteger(questionId) || questionId < 1) throw new Error("ลิงก์กระทู้ไม่ถูกต้อง");
    const response = await fetch(`./api/question?id=${encodeURIComponent(questionId)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "โหลดกระทู้ไม่สำเร็จ");
    const heading = document.createElement("h2");
    heading.textContent = data.question.body;
    const meta = document.createElement("p");
    meta.className = "thread-meta";
    meta.textContent = `${data.question.name} · ${formatThaiDate(data.question.created_at)}`;
    questionCard.replaceChildren(heading, meta);
    answerCount.textContent = `${data.answers.length} คำตอบ`;
    answers.replaceChildren();
    if (!data.answers.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "กระทู้นี้ยังไม่มีคำตอบ มาแบ่งปันเป็นคนแรกได้เลย";
      answers.append(empty);
    } else {
      data.answers.forEach((answer) => {
        const item = document.createElement("article");
        item.className = "answer-item";
        const body = document.createElement("p");
        body.className = "answer-body";
        body.textContent = answer.body;
        const author = document.createElement("p");
        author.className = "thread-meta";
        author.textContent = `${answer.name} · ${formatThaiDate(answer.created_at)}`;
        item.append(body, author);
        answers.append(item);
      });
    }
    status?.remove();
  };

  try {
    await load();
  } catch (error) {
    status.textContent = error.message || "ไม่สามารถโหลดกระทู้นี้ได้";
  }

  document.getElementById("answer-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector("button[type=submit]");
    submit.disabled = true;
    try {
      const response = await fetch("./api/answers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          questionId,
          name: document.getElementById("answer-name").value.trim(),
          answer: document.getElementById("answer-text").value.trim(),
          website: form.elements.website.value
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "ส่งคำตอบไม่สำเร็จ");
      form.reset();
      toast("ส่งคำตอบเข้ากระทู้นี้แล้ว");
      await load();
    } catch (error) {
      toast(error.message || "ส่งคำตอบไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      submit.disabled = false;
    }
  });
}

function formatThaiDate(dateValue) {
  return new Date(`${dateValue.replace(" ", "T")}Z`).toLocaleDateString("th-TH", { dateStyle: "medium" });
}

function renderQuestions(container, questions) {
  container.replaceChildren();
  if (!questions.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "ยังไม่มีคำถามในชุมชน เริ่มถามเป็นคนแรกได้เลย";
    container.append(empty);
    return;
  }
  questions.forEach((question) => {
    const item = document.createElement("article");
    item.className = "question-item";
    const title = document.createElement("a");
    title.className = "question-title question-open";
    title.href = `./question.html?id=${encodeURIComponent(question.id)}`;
    title.textContent = question.body;
    const meta = document.createElement("div");
    meta.className = "question-meta";
    const author = document.createElement("span");
    author.className = "who";
    author.textContent = `${question.name} · ${formatThaiDate(question.created_at)}`;
    meta.append(author);
    item.append(title, meta);
    container.append(item);
  });
}

const sheets = {
  math: { title: "คณิตศาสตร์", subtitle: "สรุปพื้นฐาน ม.ต้น", points: [["อัตราส่วนและร้อยละ", "ร้อยละ = (ส่วนที่สนใจ ÷ จำนวนทั้งหมด) × 100 · ร้อยละเปลี่ยนแปลง = (ผลต่าง ÷ ค่าเริ่มต้น) × 100"], ["สมการเชิงเส้น", "ax + b = c → x = (c − b) ÷ a เมื่อ a ≠ 0 · ทำสิ่งเดียวกันทั้งสองข้างของสมการ"], ["พื้นที่", "สี่เหลี่ยมผืนผ้า = กว้าง × ยาว · สามเหลี่ยม = ½ × ฐาน × สูง · วงกลม = πr² · เส้นรอบวง = 2πr"], ["เลขยกกำลัง", "aᵐ × aⁿ = aᵐ⁺ⁿ · aᵐ ÷ aⁿ = aᵐ⁻ⁿ · (aᵐ)ⁿ = aᵐⁿ · a⁰ = 1 เมื่อ a ≠ 0"], ["สถิติพื้นฐาน", "ค่าเฉลี่ย = ผลรวมข้อมูล ÷ จำนวนข้อมูล · พิสัย = ค่าสูงสุด − ค่าต่ำสุด"]] },
  science: { title: "วิทยาศาสตร์", subtitle: "สรุปพื้นฐาน ม.ต้น", points: [["แรงและการเคลื่อนที่", "ความเร็ว = ระยะทาง ÷ เวลา · น้ำหนัก = มวล × ความเร่งโน้มถ่วง · แรงลัพธ์มีผลต่อการเปลี่ยนการเคลื่อนที่"], ["สารและการแยกสาร", "เลือกวิธีแยกตามสมบัติ เช่น กรอง กลั่น ระเหย หรือใช้แม่เหล็ก · สารบริสุทธิ์มีองค์ประกอบคงที่"], ["ระบบร่างกาย", "ทางเดินอาหาร: ปาก → หลอดอาหาร → กระเพาะ → ลำไส้เล็ก → ลำไส้ใหญ่ · แลกเปลี่ยนแก๊สที่ถุงลมปอด"], ["ระบบนิเวศ", "ผู้ผลิตสร้างอาหาร · ผู้บริโภคกินสิ่งมีชีวิตอื่น · ผู้ย่อยสลายคืนธาตุอาหารสู่ระบบนิเวศ"], ["โลกและอวกาศ", "โลกหมุนรอบตัวเองประมาณ 24 ชั่วโมง · โคจรรอบดวงอาทิตย์ประมาณ 365.25 วัน"]] },
  english: { title: "ภาษาอังกฤษ", subtitle: "สรุปไวยากรณ์และการอ่าน", points: [["Present Simple", "Subject + base verb (เติม s/es เมื่อประธานเอกพจน์) · ใช้กับกิจวัตรและข้อเท็จจริง"], ["Past Simple", "Subject + V2 · ใช้กับเหตุการณ์ที่จบแล้วในอดีต · เช่น yesterday, last week, ago"], ["การเปรียบเทียบ", "ขั้นกว่า: adjective-er / more + adjective + than · ขั้นสุด: the + adjective-est / most + adjective"], ["ชนิดของคำ", "Noun = คำนาม · Verb = กริยา · Adjective = ขยายคำนาม · Adverb = ขยายกริยา/คุณศัพท์ · Preposition = บุพบท"], ["อ่านจับใจความ", "อ่านคำถามก่อน · มองหาใจความสำคัญ · ใช้บริบทช่วยเดาคำศัพท์ที่ไม่รู้"]] },
  thai: { title: "ภาษาไทย", subtitle: "สรุปหลักภาษาและการอ่าน", points: [["ชนิดของคำ", "คำนาม: คน สัตว์ สิ่งของ · คำกริยา: แสดงอาการ · คำวิเศษณ์: ขยายคำ · คำบุพบทและคำสันธาน: เชื่อมคำหรือประโยค"], ["ประโยค", "ประโยคสามัญมีใจความเดียว · ประโยครวมเชื่อมใจความที่เท่าเทียม · ประโยคซ้อนมีใจความหลักและใจความย่อย"], ["คำเป็นและคำตาย", "คำเป็น: สระเสียงยาวหรือสะกดแม่กง กน กม เกย เกอว · คำตาย: สระเสียงสั้นหรือสะกดแม่กก กด กบ"], ["การอ่านวิเคราะห์", "แยกข้อเท็จจริงจากข้อคิดเห็น · พิจารณาเจตนาผู้เขียน · สรุปใจความด้วยถ้อยคำของตนเอง"], ["ภาพพจน์", "อุปมา: เปรียบโดยมีคำเชื่อม · อุปลักษณ์: เปรียบเป็นสิ่งนั้น · บุคลาธิษฐาน: ทำให้สิ่งไม่มีชีวิตมีลักษณะมนุษย์"]] },
  social: { title: "สังคมศึกษา", subtitle: "สรุปแนวคิดพื้นฐาน", points: [["หน้าที่พลเมือง", "สิทธิ = สิ่งที่บุคคลพึงได้รับ · หน้าที่ = สิ่งที่ควรปฏิบัติ · เคารพสิทธิผู้อื่นและมีส่วนร่วมอย่างรับผิดชอบ"], ["เศรษฐศาสตร์", "อุปสงค์คือความต้องการซื้อ · อุปทานคือความต้องการขาย · ราคาตลาดสัมพันธ์กับทั้งสองปัจจัย"], ["ภูมิศาสตร์", "ละติจูดระบุตำแหน่งเหนือ-ใต้จากเส้นศูนย์สูตร · ลองจิจูดระบุตำแหน่งตะวันออก-ตะวันตกจากเส้นเมริเดียนหลัก"], ["ประวัติศาสตร์", "พิจารณาหลักฐานหลายประเภท · ตรวจสอบที่มาและช่วงเวลา · แยกข้อเท็จจริงจากการตีความ"], ["หลักธรรมพื้นฐาน", "อริยสัจ 4: ทุกข์ สมุทัย นิโรธ มรรค · ใช้พิจารณาปัญหา เหตุของปัญหา และแนวทางแก้"]] }
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[character]);
}

async function initSheets() {
  const buttons = document.querySelectorAll("[data-sheet]");
  if (!buttons.length) return;
  try {
    const response = await fetch("./data/sheets.json");
    if (!response.ok) throw new Error("Unable to load cheat sheets");
    Object.assign(sheets, await response.json());
  } catch {
    toast("โหลดข้อมูลชีทไม่สำเร็จ ลองรีเฟรชหน้าอีกครั้ง");
  }
  buttons.forEach((button) => button.addEventListener("click", () => {
    const sheet = sheets[button.dataset.sheet];
    if (!sheet) return;
    const popup = window.open("", "_blank");
    if (!popup) {
      toast("อนุญาตป๊อปอัปเพื่อเปิดชีทสรุป");
      return;
    }
    const points = sheet.points.map((point) => Array.isArray(point) ? { heading: point[0], detail: point[1] } : point);
    const sections = points.map(({ heading, detail }) => `<section><h2>${escapeHtml(heading)}</h2><p>${escapeHtml(detail)}</p></section>`).join("");
    const sources = (sheet.sources || []).map((source) => `<li><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.label)}</a></li>`).join("");
    popup.document.write(`<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(sheet.title)} | ไปต่อ ม.ปลาย</title><link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;600;700&display=swap" rel="stylesheet"><style>*{box-sizing:border-box}body{max-width:780px;margin:36px auto;padding:0 28px;color:#14324b;font:16px/1.8 'IBM Plex Sans Thai',sans-serif}.head{padding:24px 0;border-bottom:3px solid #1673c8}.eyebrow{color:#e87836;font-size:12px;font-weight:700}h1{margin:4px 0;font-size:32px}.subtitle{margin:0;color:#62788b}section{padding:16px 0;border-bottom:1px solid #dce8f1;break-inside:avoid}h2{margin:0 0 5px;color:#176eaf;font-size:18px}section p{margin:0}.sources{margin-top:26px;padding:16px;border-radius:6px;background:#eef7ff;font-size:12px}.sources h2{font-size:15px}.sources ul{margin:5px 0;padding-left:19px}.sources a{color:#105a9c;overflow-wrap:anywhere}.print{position:fixed;right:24px;top:20px;padding:10px 14px;border:0;border-radius:6px;color:white;background:#1673c8;font:600 14px 'IBM Plex Sans Thai',sans-serif;cursor:pointer}@media print{body{margin:0 auto;padding:0 12px}.print{display:none}.head{padding-top:0}}</style></head><body><button class="print" onclick="window.print()">พิมพ์ / บันทึก PDF</button><header class="head"><span class="eyebrow">ไปต่อ ม.ปลาย · CHEAT SHEET</span><h1>${escapeHtml(sheet.title)}</h1><p class="subtitle">${escapeHtml(sheet.subtitle)} · เอกสารทบทวนเบื้องต้น</p></header>${sections}<aside class="sources"><h2>แหล่งอ่านต่อ</h2><ul>${sources}</ul><p>สรุปโดย ไปต่อ ม.ปลาย · ตรวจสอบหลักสูตรและขอบเขตสอบจากประกาศทางการอีกครั้ง</p></aside></body></html>`);
    popup.document.close();
  }));
}