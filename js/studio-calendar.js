/**
 * Onyx Studios — Calendar interactions (document-level, survives re-renders)
 */
window.StudioCalendar = (function () {
  'use strict';

  let handlers = {};
  let dragState = null;
  let ghostEl = null;
  let suppressClick = false;
  let initialized = false;

  function parseSlot(el) {
    if (!el?.dataset?.calSlot) return null;
    const parts = el.dataset.calSlot.split('|');
    if (parts.length < 3) return null;
    return { date: parts[0], startTime: parts[1], column: Number(parts[2]) };
  }

  function inCalendarGrid(el) {
    return !!el?.closest?.('.studio-cal-grid-wrap');
  }

  function findSlotAt(x, y) {
    if (ghostEl) ghostEl.style.pointerEvents = 'none';
    const hit = document.elementFromPoint(x, y);
    if (ghostEl) ghostEl.style.pointerEvents = '';
    return hit?.closest?.('[data-cal-slot]') || null;
  }

  function clearSlotMarks() {
    document.querySelectorAll('.studio-cal-v2-slot.drop-target, .studio-cal-v2-slot.drop-invalid')
      .forEach((s) => s.classList.remove('drop-target', 'drop-invalid'));
  }

  function getWrap() {
    return document.querySelector('.studio-cal-grid-wrap');
  }

  function createGhost(block) {
    removeGhost();
    ghostEl = block.cloneNode(true);
    ghostEl.classList.add('studio-cal-drag-ghost');
    ghostEl.removeAttribute('data-studio-appt');
    ghostEl.querySelectorAll('[data-cal-drag-handle]').forEach((h) => h.remove());
    document.body.appendChild(ghostEl);
  }

  function positionGhost(x, y) {
    if (!ghostEl) return;
    const w = ghostEl.offsetWidth || 160;
    const h = ghostEl.offsetHeight || 56;
    ghostEl.style.left = `${x - w / 2}px`;
    ghostEl.style.top = `${y - h / 2}px`;
  }

  function removeGhost() {
    ghostEl?.remove();
    ghostEl = null;
  }

  function endDrag(ev) {
    if (!dragState) return;
    const { apptId, moved, pointerId, block } = dragState;
    const wrap = getWrap();
    wrap?.classList.remove('is-cal-dragging');
    block?.classList.remove('is-dragging');
    try { block?.releasePointerCapture(pointerId); } catch (_) { /* noop */ }
    clearSlotMarks();

    if (moved) {
      suppressClick = true;
      const slot = findSlotAt(ev.clientX, ev.clientY);
      if (slot?.classList.contains('open')) {
        const target = parseSlot(slot);
        if (target && handlers.canDrop?.(apptId, target)) {
          handlers.onReschedule?.(apptId, target);
        } else if (target) {
          handlers.onConflict?.();
        }
      }
      setTimeout(() => { suppressClick = false; }, 120);
    }

    removeGhost();
    dragState = null;
  }

  function startDrag(block, ev) {
    const apptId = block.dataset.studioAppt;
    if (!apptId || block.dataset.apptMovable !== 'true') return;

    ev.preventDefault();
    ev.stopPropagation();

    const wrap = getWrap();
    block.setPointerCapture(ev.pointerId);
    dragState = {
      apptId,
      block,
      moved: false,
      startX: ev.clientX,
      startY: ev.clientY,
      pointerId: ev.pointerId,
    };

    block.classList.add('is-dragging');
    wrap?.classList.add('is-cal-dragging');
    createGhost(block);
    positionGhost(ev.clientX, ev.clientY);

    const onMove = (e) => {
      if (!dragState) return;
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      if (Math.hypot(dx, dy) > 6) dragState.moved = true;
      positionGhost(e.clientX, e.clientY);
      clearSlotMarks();
      const slot = findSlotAt(e.clientX, e.clientY);
      if (slot?.classList.contains('open')) {
        const target = parseSlot(slot);
        const ok = target && handlers.canDrop?.(apptId, target);
        slot.classList.add(ok ? 'drop-target' : 'drop-invalid');
      }
    };

    const onUp = (e) => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      endDrag(e);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  }

  function onPointerDown(ev) {
    if (!handlers.isActive?.()) return;
    if (!inCalendarGrid(ev.target)) return;

    const handle = ev.target.closest('[data-cal-drag-handle]');
    if (!handle) return;
    const block = handle.closest('[data-studio-appt]');
    if (!block) return;
    startDrag(block, ev);
  }

  function onClick(ev) {
    if (!handlers.isActive?.()) return;
    if (!inCalendarGrid(ev.target)) return;
    if (suppressClick || dragState?.moved) {
      ev.preventDefault();
      ev.stopPropagation();
      return;
    }

    const block = ev.target.closest('[data-studio-appt]');
    if (block && !ev.target.closest('[data-cal-drag-handle]')) {
      ev.preventDefault();
      ev.stopPropagation();
      handlers.onSelectAppt?.(block.dataset.studioAppt);
      return;
    }

    const slot = ev.target.closest('[data-cal-slot].open');
    if (!slot) return;

    ev.preventDefault();
    ev.stopPropagation();
    const target = parseSlot(slot);
    if (!target) return;

    if (handlers.isMoveMode?.() && handlers.getMoveApptId?.()) {
      const apptId = handlers.getMoveApptId();
      if (handlers.canDrop?.(apptId, target)) {
        handlers.onReschedule?.(apptId, target);
      } else {
        handlers.onConflict?.();
      }
      return;
    }

    handlers.onSelectSlot?.(target);
  }

  function init() {
    if (initialized) return;
    initialized = true;
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('click', onClick, true);
  }

  function configure(nextHandlers) {
    handlers = nextHandlers || {};
  }

  return { init, configure, isDragging: () => !!dragState };
})();