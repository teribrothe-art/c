import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CustomerInviteModal } from '../../../src/components/customer-invite-modal';
import { TreatmentPhotoEditModal } from '../../../src/components/treatment-photo-edit-modal';
import { TreatmentPhotoSlot } from '../../../src/components/treatment-photo-slot';
import { parseWonAmount, sanitizeWonDigits } from '../../../lib/currency-input';
import { prepareImageForUpload } from '../../../lib/prepare-upload-image';
import { WonAmountInput } from '../../../src/components/won-amount-input';
import {
  getTreatmentPhotoSignedUrl,
  pickTreatmentPhotoFromLibrary,
  removeTreatmentPhoto,
  TreatmentPhotoKind,
  uploadTreatmentPhoto,
} from '../../../lib/treatment-photos';

import {
  showConfirmAlert,
  showErrorAlert,
  showSettlementCompleteAlert,
  showSuccessAlert,
  showWarningAlert,
} from '../../../lib/alerts';
import { getErrorMessage } from '../../../lib/errors';
import { colors, disabledButtonStyle } from '../../../lib/theme';
import {
  DURATION_OPTIONS,
  formatProductsInput,
  parseProductsInput,
  PRODUCT_PRESETS,
  TREATMENT_TYPE_OPTIONS,
  titlePresetsForType,
} from '../../../lib/treatment-options';
import {
  MAX_TREATMENT_NOTE_LENGTH,
  MAX_TREATMENT_TITLE_LENGTH,
  validateTreatmentNote,
  validateTreatmentTitle,
} from '../../../lib/validation';
import { TreatmentOptionChips } from '../../../src/components/treatment-option-chips';
import { LoadingState } from '../../../src/components/loading-state';
import {
  getPaymentByTreatmentId,
  requestCustomerPayment,
  settleDesignerPayout,
} from '../../../lib/payments';
import { normalizePaymentStatus } from '../../../lib/payment-status';
import type { PaymentRecord } from '../../../lib/payment-record';
import { notifyCustomerTreatmentRecorded } from '../../../lib/notifications';
import {
  canTreatmentSettle,
  getSettlementBlockReason,
  isDesignerSettlementInputComplete,
  shouldSyncFeedbackCompleted,
} from '../../../lib/treatment-settlement';
import { getTreatmentById, Treatment, updateTreatment } from '../../../lib/treatments';

type EditableField =
  | 'technique'
  | 'designer_diagnosis'
  | 'home_care'
  | 'price'
  | 'treatment_type'
  | 'treatment_title'
  | 'duration'
  | 'products';

const CHOICE_FIELDS: EditableField[] = ['treatment_type', 'duration'];

type InputItem = {
  editable?: EditableField;
  label: string;
  value: string;
  complete: boolean;
  optional?: boolean;
};

type InputSection = {
  title: string;
  items: InputItem[];
};

function formatDate(date: string) {
  return date.replaceAll('-', '.');
}

function getDraftValue(treatment: Treatment | null, field: EditableField) {
  if (!treatment) {
    return '';
  }

  if (field === 'price') {
    return treatment.price ? sanitizeWonDigits(String(treatment.price)) : '';
  }

  if (field === 'products') {
    return formatProductsInput(treatment.products);
  }

  if (field === 'treatment_type') {
    return treatment.treatment_type ?? '';
  }

  if (field === 'treatment_title') {
    return treatment.treatment_title ?? '';
  }

  if (field === 'duration') {
    return treatment.duration ?? '';
  }

  return treatment[field] ?? '';
}

function FieldCard({ item, onPress }: { item: InputItem; onPress?: () => void }) {
  const showRequired = !item.complete && !item.optional;

  return (
    <Pressable
      disabled={!item.editable}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fieldCard,
        item.complete ? styles.completeCard : showRequired ? styles.requiredCard : styles.optionalCard,
        pressed && styles.fieldCardPressed,
      ]}>
      <View
        style={[
          styles.leftBar,
          item.complete ? styles.completeBar : showRequired ? styles.requiredBar : styles.optionalBar,
        ]}
      />
      <View style={styles.fieldContent}>
        <View style={styles.fieldHeader}>
          <Text style={styles.fieldLabel}>{item.label}</Text>
          {item.complete ? (
            <Text style={styles.checkMark}>✓</Text>
          ) : item.optional ? (
            <Text style={styles.optionalLabel}>선택</Text>
          ) : (
            <Text style={styles.requiredLabel}>필수</Text>
          )}
        </View>
        <Text style={[styles.fieldValue, !item.complete && styles.emptyValue]}>
          {item.value || '빈 칸'}
        </Text>
      </View>
    </Pressable>
  );
}

export default function DesignerTreatmentInputScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [treatment, setTreatment] = useState<Treatment | null>(null);
  const [paymentRecord, setPaymentRecord] = useState<PaymentRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeField, setActiveField] = useState<EditableField | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [choiceValue, setChoiceValue] = useState('');
  const [photoPreviews, setPhotoPreviews] = useState<{ before: string | null; after: string | null }>({
    before: null,
    after: null,
  });
  const [photoUploadStatus, setPhotoUploadStatus] = useState<{
    before: 'idle' | 'uploading' | 'success';
    after: 'idle' | 'uploading' | 'success';
  }>({ before: 'idle', after: 'idle' });
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [photoDraft, setPhotoDraft] = useState<{ kind: TreatmentPhotoKind; uri: string } | null>(null);

  useEffect(() => {
    let isMounted = true;

    Promise.resolve()
      .then(async () => {
        if (!id) {
          throw new Error('시술 ID가 없습니다.');
        }

        const { user, treatment: nextTreatment } = await getTreatmentById(id);

        if (!isMounted) {
          return;
        }

        if (!user) {
          router.replace('/');
          return;
        }

        if (user.role !== 'designer') {
          router.replace('/home');
          return;
        }

        if (!nextTreatment) {
          setErrorMessage('시술 기록을 찾을 수 없습니다.');
          return;
        }

        const payment = await getPaymentByTreatmentId(id);
        let loadedTreatment = nextTreatment;

        if (shouldSyncFeedbackCompleted(loadedTreatment)) {
          loadedTreatment = await updateTreatment(id, { feedback_completed: true });
        }

        setTreatment(loadedTreatment);
        setPaymentRecord(payment);
        const [beforePreview, afterPreview] = await Promise.all([
          getTreatmentPhotoSignedUrl(nextTreatment.before_photo_url),
          getTreatmentPhotoSignedUrl(nextTreatment.after_photo_url),
        ]);
        setPhotoPreviews({ before: beforePreview, after: afterPreview });
        setErrorMessage('');
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        const message = getErrorMessage(error, '시술 정보를 불러오지 못했습니다.');
        setErrorMessage(message);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id]);
  const sections = useMemo<InputSection[]>(() => {
    const technique = getDraftValue(treatment, 'technique');
    const diagnosis = getDraftValue(treatment, 'designer_diagnosis');
    const homeCare = getDraftValue(treatment, 'home_care');
    const products = formatProductsInput(treatment?.products ?? null);

    return [
      {
        title: '기본 정보',
        items: [
          {
            label: '시술 종류',
            value: treatment?.treatment_type ?? '',
            complete: Boolean(treatment?.treatment_type),
            editable: 'treatment_type',
          },
          {
            label: '시술명',
            value: treatment?.treatment_title ?? '',
            complete: Boolean(treatment?.treatment_title),
            editable: 'treatment_title',
          },
          {
            label: '소요 시간',
            value: treatment?.duration ?? '',
            complete: Boolean(treatment?.duration),
            editable: 'duration',
          },
          {
            label: '시술 금액',
            value: treatment?.price ? `${treatment.price.toLocaleString('ko-KR')}원` : '',
            complete: Boolean(treatment?.price),
            editable: 'price',
          },
        ],
      },
      {
        title: '기술 데이터',
        items: [
          {
            label: '사용 약품',
            value: products,
            complete: Boolean(products),
            editable: 'products',
            optional: true,
          },
          {
            label: '기법·세팅',
            value: technique,
            complete: Boolean(technique),
            editable: 'technique',
          },
        ],
      },
      {
        title: '전문가 진단',
        items: [
          {
            label: '모발 상태 평가',
            value: diagnosis,
            complete: Boolean(diagnosis),
            editable: 'designer_diagnosis',
          },
          {
            label: '홈케어 가이드',
            value: homeCare,
            complete: Boolean(homeCare),
            editable: 'home_care',
          },
        ],
      },
    ];
  }, [treatment]);

  const allItems = sections.flatMap((section) => section.items);
  const progressItems = allItems.filter((item) => !item.optional);
  const totalProgressItems = progressItems.length;
  const completedCount = progressItems.filter((item) => item.complete).length;
  const requiredItems = progressItems.filter((item) => item.editable && !item.complete);
  const requiredCount = requiredItems.length;
  const progress = totalProgressItems > 0 ? completedCount / totalProgressItems : 0;
  const paymentStatus = normalizePaymentStatus(treatment?.payment_status);
  const isCustomerLinked = Boolean(treatment?.customer_id);
  const canRequestPayment =
    paymentStatus === 'pending' && Boolean(treatment?.price) && isCustomerLinked;
  const isSettled = normalizePaymentStatus(treatment?.payment_status) === 'completed';
  const isPaymentPaid =
    paymentRecord?.status === 'paid' ||
    paymentRecord?.status === 'in_escrow' ||
    paymentStatus === 'escrow';
  const settlementInputComplete = isDesignerSettlementInputComplete(treatment);
  const canSettle =
    !isSettled && canTreatmentSettle(treatment, paymentRecord?.status ?? null);
  const settlementBlockReason = getSettlementBlockReason(
    treatment,
    paymentRecord?.status ?? null,
  );
  const canInviteCustomer = settlementInputComplete && !isCustomerLinked;

  const openEditor = (field: EditableField) => {
    setActiveField(field);

    if (CHOICE_FIELDS.includes(field)) {
      setChoiceValue(getDraftValue(treatment, field));
      setInputValue('');
      return;
    }

    setChoiceValue('');
    setInputValue(getDraftValue(treatment, field));
  };

  const closeEditor = () => {
    setActiveField(null);
    setInputValue('');
    setChoiceValue('');
  };

  const handleSaveField = async () => {
    if (!activeField || !treatment) {
      return;
    }

    const trimmedValue = inputValue.trim();
    const isChoiceField = CHOICE_FIELDS.includes(activeField);

    if (isChoiceField) {
      if (!choiceValue.trim()) {
        showWarningAlert('항목을 선택해주세요.');
        return;
      }
    } else if (activeField === 'price') {
      const priceValue = parseWonAmount(inputValue);

      if (!priceValue || priceValue <= 0) {
        showWarningAlert('올바른 금액을 입력해주세요.');
        return;
      }
    } else if (activeField === 'treatment_title') {
      const validationError = validateTreatmentTitle(inputValue);

      if (validationError) {
        showWarningAlert(validationError);
        return;
      }
    } else if (activeField === 'products') {
      if (trimmedValue.length > MAX_TREATMENT_NOTE_LENGTH) {
        showWarningAlert(`약품 정보는 ${MAX_TREATMENT_NOTE_LENGTH}자까지 입력할 수 있습니다.`);
        return;
      }
    } else {
      const validationError = validateTreatmentNote(inputValue);

      if (validationError) {
        showWarningAlert(validationError);
        return;
      }
    }

    const priceValue = activeField === 'price' ? parseWonAmount(inputValue) : undefined;

    try {
      setIsSaving(true);
      let patch: Parameters<typeof updateTreatment>[1];

      if (activeField === 'price') {
        patch = { price: priceValue };
      } else if (activeField === 'products') {
        const parsed = parseProductsInput(trimmedValue);
        patch = { products: parsed.length ? parsed : null };
      } else if (isChoiceField) {
        patch = { [activeField]: choiceValue.trim() };
      } else {
        patch = { [activeField]: trimmedValue };
      }

      let updatedTreatment = await updateTreatment(treatment.id, patch);

      const inputComplete = isDesignerSettlementInputComplete(updatedTreatment);

      if (shouldSyncFeedbackCompleted(updatedTreatment)) {
        updatedTreatment = await updateTreatment(treatment.id, {
          feedback_completed: true,
        });
      }

      setTreatment(updatedTreatment);
      closeEditor();

      if (updatedTreatment.customer_id && inputComplete) {
        void notifyCustomerTreatmentRecorded(updatedTreatment).catch(() => undefined);
      }
    } catch (error) {
      showErrorAlert(getErrorMessage(error, '저장 중 문제가 발생했습니다.'), '저장 실패');
    } finally {
      setIsSaving(false);
    }
  };

  const processSettlement = async () => {
    if (!treatment) {
      return;
    }

    const customerName = treatment.customer_name || '고객';

    try {
      setIsSaving(true);
      const updatedTreatment = await settleDesignerPayout(treatment.id);
      setTreatment(updatedTreatment);
      setPaymentRecord(await getPaymentByTreatmentId(treatment.id));
      showSettlementCompleteAlert(customerName, () => router.replace('/designer/revenue'));
    } catch (error) {
      showErrorAlert(getErrorMessage(error, '정산 요청 중 문제가 발생했습니다.'), '정산 실패');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestSettlement = () => {
    if (!treatment || !canSettle) {
      return;
    }

    showConfirmAlert({
      title: '디자이너 정산',
      message: `고객 ${treatment.customer_name || '고객'}님 시술을 정산하시겠어요?\n수수료 차감 후 디자이너에게 송금됩니다.`,
      confirmLabel: '정산 요청',
      onConfirm: () => {
        void processSettlement();
      },
    });
  };

  const handleRequestPayment = () => {
    if (!treatment || !canRequestPayment) {
      return;
    }

    showConfirmAlert({
      title: '결제 요청',
      message: `고객 ${treatment.customer_name || '고객'}님에게 ${(treatment.price ?? 0).toLocaleString('ko-KR')}원 결제 요청을 보낼까요?`,
      confirmLabel: '결제 요청',
      onConfirm: () => {
        Promise.resolve()
          .then(async () => {
            setIsSaving(true);
            const updated = await requestCustomerPayment(treatment.id);
            setTreatment(updated);
            showSuccessAlert('결제 요청을 보냈습니다. 고객이 결제하면 에스크로에 보관됩니다.');
          })
          .catch((error) => {
            showErrorAlert(getErrorMessage(error), '결제 요청 실패');
          })
          .finally(() => {
            setIsSaving(false);
          });
      },
    });
  };


  const refreshPhotoPreview = async (nextTreatment: Treatment) => {
    const [before, after] = await Promise.all([
      getTreatmentPhotoSignedUrl(nextTreatment.before_photo_url),
      getTreatmentPhotoSignedUrl(nextTreatment.after_photo_url),
    ]);
    setPhotoPreviews({ before, after });
  };

  const flashPhotoSuccess = (kind: TreatmentPhotoKind) => {
    setPhotoUploadStatus((current) => ({ ...current, [kind]: 'success' }));
    setTimeout(() => {
      setPhotoUploadStatus((current) => ({ ...current, [kind]: 'idle' }));
    }, 1200);
  };

  const uploadPreparedPhoto = async (kind: TreatmentPhotoKind, localUri: string) => {
    if (!treatment) {
      return;
    }

    setPhotoUploadStatus((current) => ({ ...current, [kind]: 'uploading' }));

    try {
      const preparedUri =
        Platform.OS === 'web' ? await prepareImageForUpload(localUri) : localUri;
      const updatedTreatment = await uploadTreatmentPhoto(treatment.id, kind, preparedUri);
      setTreatment(updatedTreatment);
      setPhotoPreviews((current) => ({
        ...current,
        [kind]:
          updatedTreatment[kind === 'before' ? 'before_photo_url' : 'after_photo_url'] ?? preparedUri,
      }));
      await refreshPhotoPreview(updatedTreatment);
      flashPhotoSuccess(kind);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';

      if (message === 'PHOTO_TOO_LARGE') {
        showWarningAlert('사진 용량은 5MB 이하만 업로드할 수 있습니다. 다른 사진을 선택해주세요.', '용량 초과');
      } else {
        showErrorAlert(getErrorMessage(error, '사진을 다시 업로드해주세요'), '업로드 실패');
      }

      setPhotoUploadStatus((current) => ({ ...current, [kind]: 'idle' }));
    }
  };

  const handlePickPhoto = async (kind: TreatmentPhotoKind) => {
    if (!treatment || photoUploadStatus[kind] === 'uploading') {
      return;
    }

    try {
      const pickedUri = await pickTreatmentPhotoFromLibrary();

      if (!pickedUri) {
        return;
      }

      if (Platform.OS === 'web') {
        setPhotoDraft({ kind, uri: pickedUri });
        return;
      }

      await uploadPreparedPhoto(kind, pickedUri);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';

      if (message === 'PHOTO_TOO_LARGE') {
        showWarningAlert('사진 용량은 5MB 이하만 업로드할 수 있습니다. 다른 사진을 선택해주세요.', '용량 초과');
      } else {
        showErrorAlert(getErrorMessage(error, '사진을 선택하지 못했습니다.'), '사진 선택 실패');
      }
    }
  };

  const handleConfirmPhotoEdit = async (editedUri: string) => {
    if (!photoDraft) {
      return;
    }

    const { kind } = photoDraft;
    setPhotoDraft(null);
    await uploadPreparedPhoto(kind, editedUri);
  };

  const handleRemovePhoto = (kind: TreatmentPhotoKind) => {
    if (!treatment) {
      return;
    }

    const storagePath = kind === 'before' ? treatment.before_photo_url : treatment.after_photo_url;

    if (!storagePath) {
      return;
    }

    showConfirmAlert({
      title: '사진 삭제',
      message: '등록된 사진을 삭제할까요?',
      confirmLabel: '삭제',
      destructive: true,
      onConfirm: () => {
        Promise.resolve()
          .then(async () => {
            setPhotoUploadStatus((current) => ({ ...current, [kind]: 'uploading' }));
            const updatedTreatment = await removeTreatmentPhoto(treatment.id, kind, storagePath);
            setTreatment(updatedTreatment);
            await refreshPhotoPreview(updatedTreatment);
          })
          .catch((error) => {
            showErrorAlert(getErrorMessage(error, '사진 삭제에 실패했습니다.'), '삭제 실패');
          })
          .finally(() => {
            setPhotoUploadStatus((current) => ({ ...current, [kind]: 'idle' }));
          });
      },
    });
  };

  const activeFieldLabel = sections
    .flatMap((section) => section.items)
    .find((item) => item.editable === activeField)?.label;
  const isChoiceEditor = Boolean(activeField && CHOICE_FIELDS.includes(activeField));
  const isSingleLineEditor =
    activeField === 'price' || activeField === 'treatment_title' || activeField === 'products';
  const titlePresets = titlePresetsForType(treatment?.treatment_type ?? '');

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <Text style={styles.closeText}>×</Text>
          </Pressable>
          <Text style={styles.headerTitle}>시술 입력 · {treatment?.customer_name || '고객'}</Text>
          <View style={styles.headerSpacer} />
        </View>
            {isLoading ? (
          <LoadingState message="불러오는 중..." />
        ) : errorMessage || !treatment ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>시술 입력을 열 수 없어요</Text>
            <Text style={styles.stateText}>{errorMessage || '시술 정보가 없습니다.'}</Text>
          </View>
        ) : (
          <>
            <View
              style={[
                styles.linkStatusCard,
                isCustomerLinked ? styles.linkStatusConnected : styles.linkStatusPending,
              ]}>
              <Text style={styles.linkStatusTitle}>고객 연결</Text>
              <Text style={styles.linkStatusText}>
                {isCustomerLinked
                  ? '✓ 앱에 가입·연결된 고객입니다'
                  : '초대 코드로 가입하면 다이어리에 시술이 표시돼요'}
              </Text>
            </View>

            <View
              style={[
                styles.paymentStatusCard,
                !isPaymentPaid && styles.paymentStatusCardWaiting,
                isPaymentPaid && !isSettled && styles.paymentStatusCardPaid,
                isSettled && styles.paymentStatusCardDone,
              ]}>
              <Text style={styles.paymentStatusTitle}>결제 상태</Text>
              <Text
                style={[
                  styles.paymentStatusText,
                  isPaymentPaid && !isSettled && styles.paymentStatusTextMint,
                  isSettled && styles.paymentStatusTextMuted,
                ]}>
                {isSettled
                  ? `✓ 정산 완료 (${formatDate(treatment.settled_at?.slice(0, 10) || treatment.treatment_date)})`
                  : isPaymentPaid
                    ? `✓ 결제 완료. ${(paymentRecord?.designer_payout ?? 0).toLocaleString('ko-KR')}원 정산 가능`
                    : '고객 결제 대기 중'}
              </Text>
            </View>


            <View style={styles.progressBlock}>
              <View style={styles.progressTopRow}>
                <Text style={styles.progressText}>
                  완료 {completedCount}/{totalProgressItems} 항목
                </Text>
                <Text style={styles.remainingText}>
                  {settlementInputComplete
                    ? isPaymentPaid
                      ? '정산 가능'
                      : '결제 후 정산'
                    : `정산까지 ${['technique', 'designer_diagnosis', 'home_care'].filter((field) => !treatment?.[field as 'technique' | 'designer_diagnosis' | 'home_care']?.trim()).length}개`}
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
              </View>
            </View>

            <View style={styles.photoSection}>
              <Text style={styles.photoSectionTitle}>시술 사진</Text>
              <TreatmentPhotoSlot
                uploadStatus={photoUploadStatus.before}
                label="Before (전)"
                onPress={() => handlePickPhoto('before')}
                onRemove={() => handleRemovePhoto('before')}
                previewUrl={photoPreviews.before}
              />
              <TreatmentPhotoSlot
                uploadStatus={photoUploadStatus.after}
                label="After (후)"
                onPress={() => handlePickPhoto('after')}
                onRemove={() => handleRemovePhoto('after')}
                previewUrl={photoPreviews.after}
              />
            </View>

            {sections.map((section) => (
              <View key={section.title} style={styles.section}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <View style={styles.cardList}>
                  {section.items.map((item) => (
                    <FieldCard
                      key={item.label}
                      item={item}
                      onPress={item.editable ? () => openEditor(item.editable!) : undefined}
                    />
                  ))}
                </View>
              </View>
            ))}

            {canRequestPayment ? (
              <Pressable
                disabled={isSaving}
                onPress={handleRequestPayment}
                style={({ pressed }) => [styles.paymentRequestButton, pressed && styles.buttonPressed]}>
                <Text style={styles.paymentRequestButtonText}>결제 요청 보내기</Text>
              </Pressable>
            ) : paymentStatus === 'pending' && !isCustomerLinked ? (
              <View style={styles.waitingPaymentBox}>
                <Text style={styles.waitingPaymentText}>
                  고객 연결 후 결제 요청이 가능합니다 (고객 초대 → 가입)
                </Text>
              </View>
            ) : null}

            {paymentStatus === 'payment_requested' ? (
              <View style={styles.waitingPaymentBox}>
                <Text style={styles.waitingPaymentText}>고객 결제 대기 중 (에스크로 보관 예정)</Text>
              </View>
            ) : null}

            {isPaymentPaid ? (
              <View style={styles.escrowInfoBox}>
                <Text style={styles.escrowInfoText}>고객 결제 완료 · 피드백 후 정산</Text>
              </View>
            ) : null}

            {canInviteCustomer ? (
              <Pressable
                disabled={isSaving}
                onPress={() => setInviteModalVisible(true)}
                style={({ pressed }) => [
                  styles.inviteButton,
                  pressed && styles.buttonPressed,
                ]}>
                <Text style={styles.inviteButtonText}>고객 초대</Text>
              </Pressable>
            ) : null}

            <Pressable
              disabled={!canSettle || isSaving}
              onPress={handleRequestSettlement}
              style={[styles.settlementButton, canSettle ? styles.settlementButtonActive : styles.settlementButtonDisabled]}>
              <Text
                style={[
                  styles.settlementButtonText,
                  canSettle && styles.settlementButtonTextActive,
                ]}>
                {isSettled
                  ? '정산 완료'
                  : canSettle
                    ? '정산 요청'
                    : settlementBlockReason ?? `필수 항목 ${requiredCount}개 입력 후 정산 가능`}
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      <Modal animationType="slide" transparent visible={Boolean(activeField)} onRequestClose={closeEditor}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{activeFieldLabel}</Text>
            {isChoiceEditor ? (
              <TreatmentOptionChips
                options={
                  activeField === 'treatment_type'
                    ? TREATMENT_TYPE_OPTIONS
                    : [...DURATION_OPTIONS]
                }
                value={choiceValue}
                onChange={setChoiceValue}
              />
            ) : activeField === 'price' ? (
              <WonAmountInput
                placeholder="150,000"
                style={styles.modalPriceInput}
                value={inputValue}
                onChangeValue={setInputValue}
              />
            ) : (
              <>
                <TextInput
                  multiline={!isSingleLineEditor}
                  maxLength={
                    activeField === 'treatment_title'
                      ? MAX_TREATMENT_TITLE_LENGTH
                      : MAX_TREATMENT_NOTE_LENGTH
                  }
                  onChangeText={setInputValue}
                  placeholder={
                    activeField === 'products'
                      ? '예: 웰라 12%, 로레알 (쉼표·줄바꿈으로 구분)'
                      : '내용을 입력하세요'
                  }
                  placeholderTextColor="#9B9BA7"
                  style={[
                    styles.modalInput,
                    isSingleLineEditor && styles.modalInputSingleLine,
                  ]}
                  textAlignVertical={isSingleLineEditor ? 'center' : 'top'}
                  value={inputValue}
                />
                {activeField === 'treatment_title' && titlePresets.length ? (
                  <View style={styles.modalPresetBlock}>
                    <TreatmentOptionChips
                      options={titlePresets}
                      value={inputValue}
                      onChange={setInputValue}
                    />
                  </View>
                ) : null}
                {activeField === 'products' ? (
                  <View style={styles.modalPresetBlock}>
                    <TreatmentOptionChips
                      options={[...PRODUCT_PRESETS]}
                      value=""
                      onChange={(preset) => {
                        const current = parseProductsInput(inputValue);
                        if (!current.includes(preset)) {
                          setInputValue(formatProductsInput([...current, preset]));
                        }
                      }}
                    />
                  </View>
                ) : null}
                {!isSingleLineEditor ? (
                  <Text style={styles.counterText}>
                    {inputValue.length}/{MAX_TREATMENT_NOTE_LENGTH}
                  </Text>
                ) : null}
              </>
            )}
            <View style={styles.modalActions}>
              <Pressable disabled={isSaving} onPress={closeEditor} style={styles.modalCancelButton}>
                <Text style={styles.modalCancelText}>취소</Text>
              </Pressable>
              <Pressable disabled={isSaving} onPress={handleSaveField} style={styles.modalSaveButton}>
                <Text style={styles.modalSaveText}>{isSaving ? '저장 중...' : '저장'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <TreatmentPhotoEditModal
        imageUri={photoDraft?.uri ?? null}
        visible={Boolean(photoDraft)}
        onCancel={() => setPhotoDraft(null)}
        onConfirm={(editedUri) => {
          void handleConfirmPhotoEdit(editedUri);
        }}
      />

      {treatment ? (
        <CustomerInviteModal
          treatmentId={treatment.id}
          visible={inviteModalVisible}
          onClose={() => setInviteModalVisible(false)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  linkStatusCard: {
    borderRadius: 14,
    marginBottom: 12,
    padding: 14,
  },
  linkStatusPending: {
    backgroundColor: '#F3F0FF',
  },
  linkStatusConnected: {
    backgroundColor: '#E8FAF7',
  },
  linkStatusTitle: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  linkStatusText: {
    color: '#1A1A2E',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  paymentStatusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 16,
    padding: 16,
  },
  paymentStatusCardWaiting: {
    backgroundColor: '#F3F3F6',
  },
  paymentStatusCardPaid: {
    backgroundColor: '#E8FAF7',
  },
  paymentStatusCardDone: {
    backgroundColor: '#F3F3F6',
    opacity: 0.85,
  },
  paymentStatusTitle: {
    color: '#6B6B7B',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 6,
  },
  paymentStatusText: {
    color: '#6B6B7B',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 22,
  },
  paymentStatusTextMint: {
    color: '#00C2A8',
  },
  paymentStatusTextMuted: {
    color: '#9CA3AF',
  },

  container: {
    flex: 1,
    backgroundColor: '#FAFAFC',
  },
  content: {
    paddingBottom: 36,
    paddingHorizontal: 22,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  closeButton: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  closeText: {
    color: '#1A1A2E',
    fontSize: 28,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#1A1A2E',
    flex: 1,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 42,
  },
  photoSection: {
    gap: 8,
    marginBottom: 24,
  },
  photoSectionTitle: {
    color: '#6B6B7B',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 4,
  },
  progressBlock: {
    marginBottom: 28,
  },
  progressTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressText: {
    color: '#1A1A2E',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
  },
  remainingText: {
    color: '#FF5A5F',
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 19,
  },
  progressTrack: {
    height: 4,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#E6E6EE',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#00C2A8',
  },
  section: {
    marginBottom: 26,
  },
  sectionTitle: {
    color: '#6B6B7B',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 10,
  },
  cardList: {
    gap: 12,
  },
  fieldCard: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  fieldCardPressed: {
    opacity: 0.84,
  },
  completeCard: {
    backgroundColor: '#CCF2EC',
  },
  requiredCard: {
    borderWidth: 1,
    borderColor: '#FFD4D5',
  },
  optionalCard: {
    backgroundColor: '#FFFFFF',
  },
  leftBar: {
    width: 3,
  },
  completeBar: {
    backgroundColor: '#00C2A8',
  },
  requiredBar: {
    backgroundColor: '#FF5A5F',
  },
  optionalBar: {
    backgroundColor: '#C5C5D2',
  },
  optionalLabel: {
    color: '#6B6B7B',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  fieldContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  fieldHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  fieldLabel: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 24,
  },
  checkMark: {
    color: '#00C2A8',
    fontSize: 18,
    fontWeight: '900',
  },
  requiredLabel: {
    color: '#FF5A5F',
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 20,
  },
  fieldValue: {
    color: '#1A1A2E',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 21,
  },
  emptyValue: {
    color: '#6B6B7B',
  },
  paymentRequestButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: colors.coral,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 10,
    paddingVertical: 15,
  },
  paymentRequestButtonText: {
    color: colors.coral,
    fontSize: 16,
    fontWeight: '900',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  waitingPaymentBox: {
    backgroundColor: colors.lightCoral,
    borderRadius: 12,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  waitingPaymentText: {
    color: colors.coral,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  escrowInfoBox: {
    backgroundColor: colors.lightMint,
    borderRadius: 12,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  escrowInfoText: {
    color: colors.mint,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  inviteButton: {
    alignItems: 'center',
    backgroundColor: colors.coral,
    borderRadius: 14,
    marginBottom: 10,
    paddingVertical: 16,
  },
  inviteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 24,
  },
  settlementButton: {
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#CCCCCC',
    marginTop: 4,
    paddingVertical: 17,
  },
  settlementButtonDisabled: {
    ...disabledButtonStyle,
  },
  settlementButtonActive: {
    backgroundColor: '#00C2A8',
  },
  settlementButtonText: {
    color: '#6B6B7B',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 24,
  },
  settlementButtonTextActive: {
    color: '#FFFFFF',
  },
  stateBox: {
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    gap: 10,
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  stateTitle: {
    color: '#1A1A2E',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateText: {
    color: '#6B6B7B',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 46, 0.36)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 30,
  },
  counterText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 8,
    textAlign: 'right',
  },
  modalTitle: {
    color: '#1A1A2E',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 14,
  },
  modalInput: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: '#E3E3EA',
    borderRadius: 16,
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalInputSingleLine: {
    minHeight: 52,
  },
  modalPriceInput: {
    borderColor: '#E3E3EA',
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalPresetBlock: {
    marginTop: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  modalCancelButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#F0F0F4',
    paddingVertical: 15,
  },
  modalCancelText: {
    color: '#6B6B7B',
    fontSize: 16,
    fontWeight: '800',
  },
  modalSaveButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#00C2A8',
    paddingVertical: 15,
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
});
