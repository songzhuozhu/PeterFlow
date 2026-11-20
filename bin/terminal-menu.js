import { on } from 'node:events';
import { emitKeypressEvents } from 'node:readline';
import { stdin, stdout } from 'node:process';

const cancelled = 'Cancelled. / 已取消。';

// One key stream for the entire wizard keeps fast keystrokes in order across screens.
export async function withTerminalMenu(choose) {
  emitKeypressEvents(stdin);
  const keys = on(stdin, 'keypress', { close: ['end', 'close'] });
  const previousRaw = stdin.isRaw;
  stdin.setRawMode(true);
  stdin.resume();
  stdout.write('\x1b[?1049h\x1b[?25l');

  function restore() {
    stdin.setRawMode(previousRaw);
    stdout.write('\x1b[?25h\x1b[?1049l');
  }
  process.once('exit', restore);
  try {
    return await choose(async function menu(title, options, { zh = false, multiple = false, searchable = false } = {}) {
      let cursor = 0;
      let top = 0;
      let notice = '';
      let query = '';
      const expanded = new Set();
      const selected = new Set();

      function visibleRows() {
        if (query) return options.filter(option => `${option.label} ${option.value}`.toLowerCase().includes(query.toLowerCase()));
        return options.flatMap(option => expanded.has(option)
          ? [option, ...option.children]
          : [option]);
      }

      function draw() {
        const rows = visibleRows();
        const pageSize = Math.max(1, (stdout.rows || 24) - 9);
        if (cursor < top) top = cursor;
        if (cursor >= top + pageSize) top = cursor - pageSize + 1;
        top = Math.min(top, Math.max(0, rows.length - pageSize));
        const lines = ['PeterFlow', '', title];
        if (multiple) {
          lines.push(zh ? '↑↓ 移动  → 展开  ← 收起  空格勾选  回车确认  Esc 取消' : '↑↓ move  → expand  ← collapse  Space toggle  Enter confirm  Esc cancel');
          lines.push(zh ? `已选 ${selected.size} 项` : `${selected.size} selected`);
        } else if (searchable) {
          lines.push(zh ? '输入名称筛选  ↑↓ 移动  回车确认  Esc 取消' : 'Type to filter  ↑↓ move  Enter confirm  Esc cancel');
          lines.push(`› ${query}`);
        } else {
          lines.push(zh ? '↑↓ 移动  回车确认  Esc 取消' : '↑↓ move  Enter confirm  Esc cancel');
        }
        lines.push('');
        for (const [index, row] of rows.slice(top, top + pageSize).entries()) {
          let label = row.label;
          if (row.children) {
            const count = row.children.filter(skill => selected.has(skill.value)).length;
            const mark = count === 0 ? ' ' : count === row.children.length ? 'x' : '-';
            label = `[${mark}] ${expanded.has(row) ? '▾' : '▸'} ${label} (${count}/${row.children.length})`;
          } else if (multiple) {
            label = `    [${selected.has(row.value) ? 'x' : ' '}] ${label}`;
          }
          lines.push(`${top + index === cursor ? '❯' : ' '} ${label}`);
        }
        lines.push('', rows.length ? (notice || rows[cursor].hint || '') : (zh ? '没有匹配的 Agent' : 'No matching agents'));
        // Disable line wrapping while drawing. Long hints and paths stay on their own row.
        stdout.write('\x1b[?7l\x1b[H\x1b[J' + lines.join('\r\n') + '\x1b[?7h');
      }

      stdout.on('resize', draw);
      try {
        draw();
        while (true) {
          const event = await keys.next();
          if (event.done) throw new Error(cancelled);
          const [char, key] = event.value;
          if (key.name === 'escape' || (key.ctrl && ['c', 'd'].includes(key.name))) throw new Error(cancelled);
          if (searchable && (key.name === 'backspace' || (!key.ctrl && !key.meta && char && /^[a-z0-9 -]$/i.test(char)))) {
            query = key.name === 'backspace' ? query.slice(0, -1) : query + char;
            cursor = top = 0;
            draw();
            continue;
          }
          const rows = visibleRows();
          if (!rows.length) continue;
          const row = rows[cursor];
          notice = '';
          switch (key.name) {
            case 'up':
              cursor = (cursor + rows.length - 1) % rows.length;
              break;
            case 'down':
              cursor = (cursor + 1) % rows.length;
              break;
            case 'right':
              if (row.children) expanded.add(row);
              break;
            case 'left': {
              const group = row.children ? row : options.find(option => option.children?.includes(row));
              if (group) {
                expanded.delete(group);
                cursor = visibleRows().indexOf(group);
              }
              break;
            }
            case 'space': {
              if (!multiple) continue;
              const members = row.children || [row];
              const clear = members.every(item => selected.has(item.value));
              for (const item of members) {
                if (clear) selected.delete(item.value);
                else selected.add(item.value);
              }
              break;
            }
            case 'return':
            case 'enter':
              if (!multiple) return row.value;
              if (selected.size) return selected;
              notice = zh ? '请至少勾选一个分组或 Skill。' : 'Select at least one group or skill.';
              break;
            default:
              continue;
          }
          draw();
        }
      } finally {
        stdout.off('resize', draw);
      }
    });
  } finally {
    process.off('exit', restore);
    restore();
    await keys.return();
    stdin.pause();
  }
}
