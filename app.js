(() => {
  const fileInput = document.querySelector('#fileInput');
  const dropzone = document.querySelector('#dropzone');
  const uploadPanel = document.querySelector('#uploadPanel');
  const uploadEmpty = document.querySelector('#uploadEmpty');
  const uploadSelected = document.querySelector('#uploadSelected');
  const uploadError = document.querySelector('#uploadError');
  const selectedPreview = document.querySelector('#selectedPreview');
  const selectedName = document.querySelector('#selectedName');
  const selectedMeta = document.querySelector('#selectedMeta');
  const uploadProgress = document.querySelector('#uploadProgress');
  const chooseButton = document.querySelector('#chooseButton');
  const identifyButton = document.querySelector('#identifyButton');
  const clearButton = document.querySelector('#clearButton');
  const resultCard = document.querySelector('#resultCard');
  const resultPhoto = document.querySelector('#resultPhoto');
  const resultName = document.querySelector('#resultName');
  const confidenceValue = document.querySelector('#confidenceValue');
  const confidenceBar = document.querySelector('#confidenceBar');
  const featureList = document.querySelector('#featureList');
  const detailDialog = document.querySelector('#detailDialog');
  const dialogTitle = document.querySelector('#dialogTitle');
  const dialogBody = document.querySelector('#dialogBody');
  const toast = document.querySelector('#toast');
  const varietyButtons = [...document.querySelectorAll('.variety-card')];
  const nav = document.querySelector('#primaryNav');

  const varietyNotes = {
    同安红: '玫红色苞片，常见白色小花，花色明亮，适合庭院和阳台栽培。',
    白雪公主: '花色洁白清新，株型紧凑，养护得当时花期较长。',
    金心双色: '苞片带有金黄色调，色彩明快，适合光照充足的位置。',
    紫花三角梅: '紫色苞片独特醒目，耐热耐晒，盛花时花量较大。',
    小叶紫: '叶片较小、枝条细密，适合盆景造型和小空间种植。',
    绿叶白花: '白色苞片与绿叶相衬，整体观感清雅，适合庭院布置。'
  };
  const careDetails = {
    sun: { title: '光照', text: '三角梅喜阳光。生长期尽量提供每天 4–6 小时以上的直射光；室内养护可放在朝南或采光好的窗边。夏季高温时注意观察叶片状态。' },
    water: { title: '浇水', text: '等盆土表层干燥后再浇透，保持盆土排水通畅。连续阴雨或气温较低时减少浇水，避免托盘和盆底长期积水。' },
    prune: { title: '修剪', text: '花后可剪去残花和过长枝条，疏除交叉、过密的枝条。修剪后给新枝留出空间，帮助植株维持通风和株型。' },
    feed: { title: '施肥', text: '生长期可每 2–4 周施用一次稀薄、均衡的肥料。遵循产品说明并先浇湿盆土，避免浓肥直接接触根系。' }
  };
  const extraVarieties = [
    ['绿樱', '嫩绿渐变 · 花色清新'], ['加州黄金', '金黄明亮 · 喜充足光照'], ['樱花三角梅', '粉白渐层 · 观赏性强'],
    ['漳州红樱', '红粉相间 · 花量丰富'], ['口红', '白红双色 · 辨识度高'], ['重瓣水红', '层叠花瓣 · 柔和淡雅']
  ];

  let selectedFile = null;
  let objectUrl = '';
  let busy = false;
  let currentVariety = '同安红';
  let currentConfidence = 96;
  let toastTimer;
  let history = readHistory();
  let previewTarget = null;
  let previewState = 'default';
  let mobileNavOpen = false;

  function readHistory() {
    try { return JSON.parse(sessionStorage.getItem('bougainvillea-demo-history') || '[]'); }
    catch { return []; }
  }

  function saveHistory(record) {
    history = [record, ...history].slice(0, 8);
    try { sessionStorage.setItem('bougainvillea-demo-history', JSON.stringify(history)); }
    catch { /* The prototype still works if storage is unavailable. */ }
  }

  function announce(message) {
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2800);
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }

  function showDialog(title, html) {
    dialogTitle.textContent = title;
    dialogBody.innerHTML = html;
    if (!detailDialog.open) detailDialog.showModal();
  }

  function closeDialog() {
    if (detailDialog.open) detailDialog.close();
  }

  function setNavCurrent(element) {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('is-current');
      link.removeAttribute('aria-current');
    });
    if (element?.classList.contains('nav-link')) {
      element.classList.add('is-current');
      if (element.tagName === 'A') element.setAttribute('aria-current', 'page');
    }
  }

  function closeMobileNav() {
    mobileNavOpen = false;
    nav.classList.remove('is-open');
    const toggle = document.querySelector('[data-ui="menu-toggle"]');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', '打开导航菜单');
  }

  function setBusy(next) {
    busy = next;
    uploadPanel.setAttribute('aria-busy', String(next));
    uploadPanel.classList.toggle('is-busy', next);
    fileInput.disabled = next;
    chooseButton.disabled = next;
    identifyButton.disabled = next;
    clearButton.disabled = next;
    dropzone.setAttribute('aria-disabled', String(next));
    dropzone.tabIndex = next ? -1 : 0;
    if (next) uploadProgress.hidden = false;
    else uploadProgress.hidden = true;
  }

  function showUploadError(message) {
    uploadError.textContent = message;
    uploadError.hidden = false;
    window.setTimeout(() => { uploadError.hidden = true; }, 4200);
  }

  function renderSelectedFile(file) {
    if (!file || busy) return;
    uploadError.hidden = true;
    const acceptedType = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
    const acceptedExtension = /\.(jpe?g|png|webp)$/i.test(file.name);
    if (!(acceptedType || acceptedExtension)) {
      showUploadError('暂不支持此格式，请选择 JPG、PNG 或 WEBP 图片。');
      fileInput.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showUploadError('图片超过 10MB，请压缩后再上传。');
      fileInput.value = '';
      return;
    }
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    selectedFile = file;
    objectUrl = URL.createObjectURL(file);
    selectedPreview.src = objectUrl;
    selectedName.textContent = file.name;
    selectedMeta.textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB · 准备就绪`;
    uploadEmpty.hidden = true;
    uploadSelected.hidden = false;
    setBusy(false);
    announce('照片已添加，准备好后可以开始识别。');
  }

  function resetUpload() {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = '';
    selectedFile = null;
    fileInput.value = '';
    selectedPreview.removeAttribute('src');
    uploadSelected.hidden = true;
    uploadEmpty.hidden = false;
    uploadError.hidden = true;
    setBusy(false);
  }

  function setVariety(button, confidence = 96) {
    const name = button.dataset.variety;
    currentVariety = name;
    currentConfidence = confidence;
    varietyButtons.forEach(item => {
      const selected = item === button;
      item.classList.toggle('is-selected', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
    resultPhoto.src = button.dataset.photo;
    resultPhoto.alt = `${name}三角梅品种图片`;
    resultName.textContent = name;
    confidenceValue.textContent = `${confidence}%`;
    confidenceBar.style.width = `${confidence}%`;
    resultCard.querySelector('.confidence-track').setAttribute('aria-valuenow', String(confidence));
    resultCard.setAttribute('aria-label', `打开${name}三角梅识别详情`);
    featureList.replaceChildren();
    (button.dataset.features || '').split(',').forEach((feature, index, all) => {
      const span = document.createElement('span');
      span.textContent = feature;
      featureList.append(span);
      if (index < all.length - 1) {
        const divider = document.createElement('i');
        divider.setAttribute('aria-hidden', 'true');
        featureList.append(divider);
      }
    });
  }

  function showResultDetails() {
    const fileCopy = selectedFile ? `<p><strong>本次图片：</strong>${escapeHTML(selectedFile.name)}</p>` : '<p><strong>结果类型：</strong>页面默认展示的识别样例</p>';
    const demoCopy = selectedFile ? '<p>这是用于展示上传后交互流程的界面原型，当前页面以示例数据模拟识别反馈。</p>' : '';
    showDialog(`${currentVariety} · 识别详情`, `<p><strong>识别对象：</strong>三角梅（${escapeHTML(currentVariety)}）</p><p><strong>识别置信度：</strong>${currentConfidence}%</p><p><strong>主要特征：</strong>${escapeHTML((varietyButtons.find(item => item.dataset.variety === currentVariety)?.dataset.features || '').replaceAll(',', '、'))}</p>${fileCopy}${demoCopy}<p>${escapeHTML(varietyNotes[currentVariety] || '三角梅品种信息可结合花色、苞片形状、叶片和生长习性综合观察。')}</p>`);
  }

  function showHistory() {
    let body;
    if (history.length) {
      body = `<p>本次浏览器会话中保存了 ${history.length} 条演示记录。</p><ul>${history.map(item => `<li><strong>${escapeHTML(item.name)}</strong> · ${escapeHTML(item.time)}<br>${escapeHTML(item.file)}</li>`).join('')}</ul><p>记录仅保存在当前浏览器会话中。</p>`;
    } else {
      body = '<p>这里会显示本次浏览器会话中的识别记录。</p><p>上传照片并点击“开始识别”后，记录会出现在这里。</p><p>当前页面提供的是用于展示交互流程的界面原型。</p>';
    }
    showDialog('识别记录', body);
  }

  function showMoreVarieties() {
    const buttons = extraVarieties.map(([name, note], index) => `<button class="more-variety-option" type="button" data-modal-variety="${escapeHTML(name)}" data-modal-index="${index}"><svg class="icon"><use href="#i-leaf"/></svg><span><strong>${escapeHTML(name)}</strong><small>${escapeHTML(note)}</small></span><svg class="icon option-arrow"><use href="#i-arrow"/></svg></button>`).join('');
    showDialog('更多三角梅品种', `<p>不同品种的苞片颜色和株型各有特点。选择一项，可在首页结果卡片中查看示例介绍。</p><div class="more-varieties-list">${buttons}</div>`);
  }

  function startRecognition() {
    if (!selectedFile || busy) return;
    const fileName = selectedFile.name;
    setBusy(true);
    selectedMeta.textContent = '正在分析照片…';
    identifyButton.textContent = '正在识别';
    window.setTimeout(() => {
      const index = Math.abs([...fileName].reduce((sum, char) => sum + char.charCodeAt(0), 0)) % varietyButtons.length;
      const confidence = 92 + (index % 7);
      setVariety(varietyButtons[index], confidence);
      selectedMeta.textContent = '演示识别完成';
      identifyButton.textContent = '再次识别';
      saveHistory({ name: varietyButtons[index].dataset.variety, file: fileName, time: new Date().toLocaleString('zh-CN', { hour12: false }) });
      setBusy(false);
      announce(`识别流程已完成，示例结果为“${currentVariety}”。`);
    }, 850);
  }

  document.querySelector('#chooseButton').addEventListener('click', event => {
    event.stopPropagation();
    if (!busy) fileInput.click();
  });
  dropzone.addEventListener('click', event => {
    if (event.target.closest('button') || busy) return;
    fileInput.click();
  });
  dropzone.addEventListener('keydown', event => {
    if (event.target !== dropzone || busy || !['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    fileInput.click();
  });
  fileInput.addEventListener('change', () => renderSelectedFile(fileInput.files?.[0]));
  clearButton.addEventListener('click', event => { event.stopPropagation(); if (!busy) resetUpload(); });
  identifyButton.addEventListener('click', event => { event.stopPropagation(); startRecognition(); });
  ['dragenter', 'dragover'].forEach(type => uploadPanel.addEventListener(type, event => {
    event.preventDefault();
    if (!busy) uploadPanel.classList.add('is-dragging');
  }));
  ['dragleave', 'dragend', 'drop'].forEach(type => uploadPanel.addEventListener(type, event => {
    event.preventDefault();
    uploadPanel.classList.remove('is-dragging');
  }));
  uploadPanel.addEventListener('drop', event => {
    if (busy) return;
    const file = [...(event.dataTransfer?.files || [])].find(item => item.type.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(item.name));
    if (file) renderSelectedFile(file);
    else showUploadError('没有找到可识别的图片文件。');
  });

  varietyButtons.forEach(button => button.addEventListener('click', () => {
    if (busy) return;
    setVariety(button, 92 + ((varietyButtons.indexOf(button) * 3 + 1) % 8));
    announce(`已查看“${button.dataset.variety}”品种示例。`);
  }));

  document.querySelectorAll('.advice-item').forEach(button => button.addEventListener('click', () => {
    const advice = careDetails[button.dataset.advice];
    showDialog(`${advice.title}建议`, `<p>${escapeHTML(advice.text)}</p><p>养护方式会受季节、温度、盆土和生长环境影响，请根据植株状态调整。</p>`);
  }));
  resultCard.addEventListener('click', showResultDetails);
  resultCard.addEventListener('keydown', event => {
    if (event.target === resultCard && ['Enter', ' '].includes(event.key)) { event.preventDefault(); showResultDetails(); }
  });

  document.querySelectorAll('[data-action="history"]').forEach(button => button.addEventListener('click', () => {
    setNavCurrent(button.classList.contains('nav-link') ? button : document.querySelector('.nav-link[data-action="history"]'));
    closeMobileNav();
    showHistory();
  }));
  document.querySelector('[data-action="about"]').addEventListener('click', event => {
    setNavCurrent(event.currentTarget);
    closeMobileNav();
    showDialog('关于花见识', '<p>花见识是一份关于三角梅的轻量植物识别界面原型。</p><p>我们希望帮助你通过花朵、叶片和枝条的细节认识常见品种，并快速找到基础养护提示。</p><p>当前交互用于界面演示，上传后的识别结果由示例数据模拟。</p>');
  });
  document.querySelector('[data-action="more-varieties"]').addEventListener('click', showMoreVarieties);
  document.querySelectorAll('[data-action="dialog-close"]').forEach(button => button.addEventListener('click', closeDialog));
  detailDialog.addEventListener('click', event => {
    if (event.target === detailDialog) closeDialog();
    const option = event.target.closest('[data-modal-variety]');
    if (option) {
      const [name] = extraVarieties[Number(option.dataset.modalIndex)];
      const photoButton = varietyButtons[Number(option.dataset.modalIndex) % varietyButtons.length];
      currentVariety = name;
      currentConfidence = 94;
      resultName.textContent = name;
      resultPhoto.src = photoButton.dataset.photo;
      resultPhoto.alt = `${name}品种示意图片`;
      confidenceValue.textContent = '94%';
      confidenceBar.style.width = '94%';
      resultCard.querySelector('.confidence-track').setAttribute('aria-valuenow', '94');
      featureList.textContent = '品种示例 · 花色各异 · 喜充足光照';
      varietyButtons.forEach(button => { button.classList.remove('is-selected'); button.setAttribute('aria-pressed', 'false'); });
      closeDialog();
      announce(`已展示“${name}”品种示例。`);
    }
  });

  document.querySelectorAll('.nav-link[href]').forEach(link => link.addEventListener('click', event => {
    if (link.getAttribute('href') === '#top') {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setNavCurrent(link);
    closeMobileNav();
  }));
  document.querySelector('.brand').addEventListener('click', event => {
    event.preventDefault();
    setNavCurrent(document.querySelector('.nav-link[href="#top"]'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  const menuToggle = document.querySelector('[data-ui="menu-toggle"]');
  menuToggle.addEventListener('click', () => {
    mobileNavOpen = !mobileNavOpen;
    nav.classList.toggle('is-open', mobileNavOpen);
    menuToggle.setAttribute('aria-expanded', String(mobileNavOpen));
    menuToggle.setAttribute('aria-label', mobileNavOpen ? '关闭导航菜单' : '打开导航菜单');
  });
  window.addEventListener('resize', () => { if (window.innerWidth > 900 && mobileNavOpen) closeMobileNav(); });

  function restorePreview() {
    if (!previewTarget) return;
    previewTarget.classList.remove('is-preview-hover', 'is-preview-active', 'is-preview-disabled');
    if (previewTarget.dataset.previewWasDisabled !== undefined) {
      previewTarget.disabled = previewTarget.dataset.previewWasDisabled === 'true';
      delete previewTarget.dataset.previewWasDisabled;
    }
    if (previewTarget.dataset.previewHadAriaDisabled === 'false') previewTarget.removeAttribute('aria-disabled');
    else if (previewTarget.dataset.previewHadAriaDisabled) previewTarget.setAttribute('aria-disabled', previewTarget.dataset.previewHadAriaDisabled);
    delete previewTarget.dataset.previewHadAriaDisabled;
    if (previewTarget.dataset.previewHadTabindex === 'none') previewTarget.removeAttribute('tabindex');
    else if (previewTarget.dataset.previewHadTabindex !== undefined) previewTarget.setAttribute('tabindex', previewTarget.dataset.previewHadTabindex);
    delete previewTarget.dataset.previewHadTabindex;
    previewTarget = null;
  }

  document.querySelectorAll('[data-preview-state]').forEach(button => button.addEventListener('click', () => {
    restorePreview();
    previewState = button.dataset.previewState;
    const name = document.querySelector('#stateTarget').value;
    previewTarget = document.querySelector(`[data-ui="${name}"]`);
    document.querySelectorAll('[data-preview-state]').forEach(item => item.classList.toggle('is-current', item === button));
    if (!previewTarget) return;
    if (previewTarget instanceof HTMLButtonElement) previewTarget.dataset.previewWasDisabled = String(previewTarget.disabled);
    previewTarget.dataset.previewHadAriaDisabled = previewTarget.getAttribute('aria-disabled') ?? 'false';
    previewTarget.dataset.previewHadTabindex = previewTarget.hasAttribute('tabindex') ? previewTarget.getAttribute('tabindex') : 'none';
    if (previewState === 'hover') previewTarget.classList.add('is-preview-hover');
    if (previewState === 'active') previewTarget.classList.add('is-preview-active');
    if (previewState === 'disabled') {
      previewTarget.classList.add('is-preview-disabled');
      previewTarget.setAttribute('aria-disabled', 'true');
      previewTarget.setAttribute('tabindex', '-1');
      if (previewTarget instanceof HTMLButtonElement) previewTarget.disabled = true;
    }
    const labels = { default: '默认', hover: '鼠标移入', active: '点击', disabled: '禁用' };
    document.querySelector('#stateMessage').textContent = `当前展示：${labels[previewState]}状态`;
  }));
  document.querySelector('#stateTarget').addEventListener('change', () => {
    restorePreview();
    document.querySelector('[data-preview-state="default"]').click();
  });
  document.addEventListener('click', event => {
    if (event.target.closest('.is-preview-disabled')) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
  document.addEventListener('keydown', event => {
    if (event.target.closest?.('.is-preview-disabled') && ['Enter', ' '].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  setBusy(false);
})();
