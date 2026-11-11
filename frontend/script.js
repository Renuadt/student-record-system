    let editRoll = null;
    let confirmRoll = null;
    const el = (id) => document.getElementById(id);

    function notify(msg, isError = false) {
      const box = el('notice');
      el('notice-text').textContent = msg;
      box.className = isError ? 'notice error' : 'notice';
      box.hidden = false;
    }

    el('notice-close').addEventListener('click', () => { el('notice').hidden = true; });

    async function request(url, options) {
      try {
        const res = await fetch(url, options);
        return await res.json();
      } catch (e) {
        return { status: 'error', message: 'Network error: unable to reach registry server' };
      }
    }

    function renderRows(students) {
      const tbody = el('ledger-body');
      tbody.textContent = '';
      if (!students.length) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 5;
        td.className = 'empty-row';
        td.textContent = 'No records in ledger.';
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
      }

      students.forEach((s, i) => {
        const tr = document.createElement('tr');
        tr.className = 'row-item';
        tr.style.animationDelay = `${Math.min(i * 20, 160)}ms`;

        const tdRoll = document.createElement('td');
        tdRoll.className = 'col-roll';
        tdRoll.textContent = s.roll;

        const tdName = document.createElement('td');
        tdName.textContent = s.name;

        const tdMarks = document.createElement('td');
        tdMarks.className = 'col-marks';
        tdMarks.textContent = s.marks;

        const tdGrade = document.createElement('td');
        tdGrade.className = 'col-grade';
        const stamp = document.createElement('span');
        stamp.className = `stamp stamp-${s.grade}`;
        stamp.textContent = s.grade;
        tdGrade.appendChild(stamp);

        const tdAct = document.createElement('td');
        tdAct.className = 'col-act';

        if (confirmRoll === s.roll) {
          const btnYes = document.createElement('button');
          btnYes.className = 'danger';
          btnYes.textContent = 'Confirm';
          btnYes.onclick = () => removeStudent(s.roll);

          const btnNo = document.createElement('button');
          btnNo.textContent = 'Cancel';
          btnNo.onclick = () => { confirmRoll = null; renderRows(students); };
          tdAct.append(btnYes, btnNo);
        } else {
          const btnEdit = document.createElement('button');
          btnEdit.textContent = 'Update';
          btnEdit.onclick = () => startEdit(s);

          const btnDel = document.createElement('button');
          btnDel.textContent = 'Delete';
          btnDel.onclick = () => { confirmRoll = s.roll; renderRows(students); };
          tdAct.append(btnEdit, btnDel);
        }

        tr.append(tdRoll, tdName, tdMarks, tdGrade, tdAct);
        tbody.appendChild(tr);
      });
    }

    async function loadStats() {
      const res = await request('/api/stats');
      if (res.status === 'ok') {
        const d = res.data;
        el('st-count').textContent = d.count;
        el('st-avg').textContent = Number(d.average).toFixed(2);
        el('st-high').textContent = `${d.highest.marks} (${d.highest.grade})`;
        el('st-high-sub').textContent = `#${d.highest.roll} ${d.highest.name}`;
        el('st-low').textContent = `${d.lowest.marks} (${d.lowest.grade})`;
        el('st-low-sub').textContent = `#${d.lowest.roll} ${d.lowest.name}`;
      } else {
        el('st-count').textContent = '0';
        el('st-avg').textContent = '—';
        el('st-high').textContent = '—';
        el('st-high-sub').textContent = res.message || 'No students stored yet';
        el('st-low').textContent = '—';
        el('st-low-sub').textContent = '—';
      }
    }

    async function loadList(sorted = false) {
      confirmRoll = null;
      const res = await request(sorted ? '/api/sort' : '/api/students');
      if (res.status === 'ok') {
        el('view-heading').textContent = sorted ? 'Records (By Marks)' : 'Records';
        renderRows(res.data);
      } else {
        notify(res.message, true);
      }
      await loadStats();
    }

    function startEdit(s) {
      editRoll = s.roll;
      el('in-roll').value = s.roll;
      el('in-roll').readOnly = true;
      el('in-name').value = s.name;
      el('in-marks').value = s.marks;
      el('form-heading').textContent = `Update #${s.roll}`;
      el('form-badge').hidden = false;
      el('btn-save').textContent = 'Save Changes';
      el('btn-cancel').hidden = false;
      el('in-name').focus();
    }

    function resetForm() {
      editRoll = null;
      el('student-form').reset();
      el('in-roll').readOnly = false;
      el('form-heading').textContent = 'Enrol Student';
      el('form-badge').hidden = true;
      el('btn-save').textContent = 'Enrol Student';
      el('btn-cancel').hidden = true;
    }

    el('btn-cancel').addEventListener('click', resetForm);

    el('student-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const roll = el('in-roll').value.trim();
      const name = el('in-name').value.trim();
      const marks = el('in-marks').value.trim();

      const isUpdate = editRoll !== null;
      const url = isUpdate ? `/api/students/${encodeURIComponent(editRoll)}` : '/api/students';
      const body = isUpdate ? { name, marks } : { roll, name, marks };

      const res = await request(url, {
        method: isUpdate ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.status === 'ok') {
        notify(isUpdate ? `Updated roll #${res.data.roll}` : `Enrolled roll #${res.data.roll}`);
        resetForm();
        await loadList();
      } else {
        notify(res.message, true);
      }
    });

    el('search-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const roll = el('in-search').value.trim();
      const res = await request(`/api/students/${encodeURIComponent(roll)}`);
      if (res.status === 'ok') {
        confirmRoll = null;
        el('view-heading').textContent = `Search Result: #${res.data.roll}`;
        renderRows([res.data]);
        el('notice').hidden = true;
      } else {
        notify(res.message, true);
      }
    });

    async function removeStudent(roll) {
      const res = await request(`/api/students/${encodeURIComponent(roll)}`, { method: 'DELETE' });
      if (res.status === 'ok') {
        if (editRoll === roll) resetForm();
        notify(`Deleted roll #${res.data.roll} (${res.data.name})`);
        await loadList();
      } else {
        notify(res.message, true);
      }
    }

    el('btn-reset').addEventListener('click', () => { el('search-form').reset(); loadList(false); });
    el('btn-list').addEventListener('click', () => loadList(false));
    el('btn-sort').addEventListener('click', () => loadList(true));

    loadList(false);
