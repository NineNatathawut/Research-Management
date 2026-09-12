import { defineComponent, ref, computed, type PropType } from 'vue';
import { api } from '../api/client';
import type { Paper } from '../types';
import './PaperCard.css';

export default defineComponent({
  name: 'PaperCard',
  props: {
    paper: {
      type: Object as PropType<Paper>,
      required: true,
    },
    userId: {
      type: Number,
      default: undefined,
    },
  },
  emits: {
    rejected: (paperId: number) => typeof paperId === 'number',
    'reject-paper': (paperId: number) => typeof paperId === 'number',
    'edit-metadata': (paper: Paper) => Boolean(paper),
  },
  setup(props, { emit }) {
    const isRejecting = ref(false);
    const isRemoving = ref(false);
    const feedbackMessage = ref('');
    const feedbackType = ref<'success' | 'error'>('success');

    const paperStatusClass = computed(() => {
      switch (props.paper.paper_status) {
        case 'COMPLETED': return 'paper-completed';
        case 'PENDING_CO_AUTHOR': return 'paper-coauthor';
        case 'DRAFT_AUTO': return 'paper-draft';
        default: return '';
      }
    });

    const scholarUrl = computed(() => {
      if (props.paper?.scholar_url) {
        return props.paper.scholar_url;
      }
      const title = props.paper?.title || '';
      return `https://scholar.google.com/scholar?q=${encodeURIComponent(title)}`;
    });

    const authorList = computed(() => {
      const raw = props.paper?.authors_raw;
      if (raw && typeof raw === 'string' && raw.trim() !== '') {
        return raw;
      }

      const arr: unknown = props.paper?.authors || props.paper?.paper_authors;
      if (Array.isArray(arr) && arr.length > 0) {
        return arr
          .map(a => typeof a === 'object' && a !== null ? (a.name || a.author_name) : a)
          .filter(Boolean)
          .join(', ');
      }

      if (typeof arr === 'string' && arr.trim() !== '') {
        return arr;
      }

      return 'ไม่ระบุรายชื่อผู้จัดทำ';
    });

    function formatPaperStatus(status?: string): string {
      switch (status) {
        case 'COMPLETED': return 'ยืนยันสมบูรณ์ (100%)';
        case 'PENDING_CO_AUTHOR': return 'รอผู้ร่วมวิจัยยืนยัน';
        case 'DRAFT_AUTO': return 'ดึงอัตโนมัติ (DRAFT_AUTO)';
        default: return status || 'DRAFT';
      }
    }

    function showFeedback(msg: string, type: 'success' | 'error' = 'success') {
      feedbackMessage.value = msg;
      feedbackType.value = type;
      setTimeout(() => {
        feedbackMessage.value = '';
      }, 3500);
    }

    async function handleReject() {
      if (!confirm(`คุณต้องการปฏิเสธผลงาน "${props.paper.title}" ใช่หรือไม่?\n\n(ระบบจะนำเข้า Blacklist เพื่อไม่ให้ดึงข้อมูลนี้เข้ามาอีก)`)) {
        return;
      }

      isRejecting.value = true;
      try {
        await api.post('/api/papers/reject', {
          userId: props.userId,
          scholarTitle: props.paper.title,
          paperId: props.paper.paper_id,
        });

        isRemoving.value = true;
        setTimeout(() => {
          emit('rejected', props.paper.paper_id);
          emit('reject-paper', props.paper.paper_id);
        }, 300);
      } catch (error: any) {
        console.error(error);
        const err = error?.response?.data?.error || 'เกิดข้อผิดพลาดในการปฏิเสธผลงาน';
        showFeedback(err, 'error');
        isRejecting.value = false;
      }
    }

    return () => (
      <div 
        class={{ 
          'paper-card': true,
          'is-pending': true,
          'is-removing': isRemoving.value,
        }}
        onClick={() => emit('edit-metadata', props.paper)}
      >
        {/* Header: Status Badges + Title */}
        <div class="card-header clickable-area">
          <div class="badge-group">
            <span class={`badge badge-paper-status ${paperStatusClass.value}`}>
              {formatPaperStatus(props.paper.paper_status)}
            </span>
          </div>

          <div class="meta-tags">
            {props.paper.publish_year ? (
              <span class="tag tag-year">📅 {props.paper.publish_year}</span>
            ) : null}
            <span class="tag tag-cited">
              📈 อ้างอิง {props.paper.cited_by || props.paper.citations || 0} ครั้ง
            </span>
          </div>
        </div>

        {/* Body: Read-only Paper Details */}
        <div class="card-body">
          <h3 class="paper-title">
            {props.paper.scholar_url ? (
              <a 
                href={props.paper.scholar_url} 
                target="_blank" 
                rel="noopener noreferrer" 
                title="เปิดดูใน Google Scholar"
                onClick={(e) => e.stopPropagation()}
              >
                {props.paper.title}
                <span class="external-icon">↗</span>
              </a>
            ) : (
              <span 
                onClick={() => emit('edit-metadata', props.paper)}
                style={{ cursor: 'pointer' }}
              >
                {props.paper.title}
              </span>
            )}
          </h3>

          <p class="paper-authors">
            <span class="author-label">👥 คณะผู้จัดทำ:</span>
            <span class="author-names">{authorList.value}</span>
          </p>
        </div>

        {/* Action Buttons (Scholar + Reject) */}
        <div class="card-actions-panel" onClick={(e) => e.stopPropagation()}>
          <div class="buttons-row">
            <a 
              class="btn btn-scholar"
              href={scholarUrl.value}
              target="_blank"
              rel="noopener noreferrer"
              title="เปิดดูผลงานนี้บน Google Scholar"
            >
              <span>🎓 ดูบน Google Scholar</span>
            </a>

            <button 
              type="button" 
              class="btn btn-danger-outline" 
              onClick={handleReject}
              disabled={isRejecting.value}
              title="ซ่อนผลงานนี้และบันทึกลง Blacklist เพื่อไม่ให้ระบบดึงซ้ำ"
            >
              {isRejecting.value ? <span>กำลังปฏิเสธ...</span> : <span>✕ ไม่ใช่ผลงานฉัน</span>}
            </button>
          </div>

          {feedbackMessage.value ? (
            <div class={`feedback-toast feedback-${feedbackType.value}`}>
              {feedbackMessage.value}
            </div>
          ) : null}
        </div>
      </div>
    );
  },
});

