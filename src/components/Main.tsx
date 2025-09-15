/** @jsx h */
import {h, JSX, Ref} from 'preact';
import type {
  AirgapAPI,
  AirgapAuth,
  ConsentManagerConfig,
  ViewState,
} from '@transcend-io/airgap.js-types';
import { ConsentManagerLanguageKey } from '@transcend-io/internationalization';
import { isResponseViewState, isViewStateClosed } from '../hooks';
import type { HandleSetViewState } from '../types';
import { Collapsed } from './Collapsed';
import { AcceptAll } from './AcceptAll';
import { BottomMenu } from './BottomMenu';
import { CompleteOptions } from './CompleteOptions';
import { LanguageOptions } from './LanguageOptions';
import { CompleteOptionsInverted } from './CompleteOptionsInverted';
import { NoticeAndDoNotSell } from './NoticeAndDoNotSell';
import { QuickOptions } from './QuickOptions';
import { OptOutDisclosure } from './OptOutDisclosure';
import { AcceptOrRejectAdvertising } from './AcceptOrRejectAdvertising';
import { AcceptOrRejectAll } from './AcceptOrRejectAll';
import { DoNotSellDisclosure } from './DoNotSellDisclosure';
import { AcceptOrRejectAnalytics } from './AcceptOrRejectAnalytics';
import { DoNotSellExplainer } from './DoNotSellExplainer';
import { QuickOptions3 } from './QuickOptions3';
import { PrivacyPolicyNotice } from './PrivacyPolicyNotice';
import { PrivacyPolicyNoticeWithCloseButton } from './PrivacyPolicyNoticeWithCloseButton';
import { AcceptAllOrMoreChoices } from './AcceptAllOrMoreChoices';
import { AcceptOrRejectAllOrMoreChoices } from './AcceptOrRejectAllOrMoreChoices';
import { AcceptAllRejectAllToggle } from './AcceptAllRejectAllToggle';
import { useEffect, useRef } from 'preact/hooks';
import { CompleteOptionsToggles } from './CompleteOptionsToggles';
import { initialFocusElement, consumeNextFocusTarget, peekNextFocusTarget } from '../helpers';
import { ObjByString } from '@transcend-io/type-utils';

/**
 * Presents view states (collapsed, GDPR-mode, CCPA-mode etc)
 */
export function Main({
  airgap,
  viewState,
  config,
  firstSelectedViewState,
  globalUiVariables,
  handleSetViewState,
  bannerTopRef,
  handleChangeLanguage,
  supportedLanguages,
  modalOpenAuth,
}: {
  /** Global variables for UI view state */
  globalUiVariables: ObjByString;
  /** airgap.js API */
  airgap: AirgapAPI;
  /** Configuration for consent UI */
  config: ConsentManagerConfig;
  /** The on click event passed as authentication to airgap. Needed for do-not-sell acknowledgement */
  modalOpenAuth?: AirgapAuth;
  /** The current viewState of the consent manager */
  viewState: ViewState;
  /** First view state selected when transcend.showConsentManager() is called */
  firstSelectedViewState: ViewState | 'AcceptOrRejectAll' | null;
  /** Updater function for viewState */
  handleSetViewState: HandleSetViewState;
  /** Ref to the top of the banner */
  bannerTopRef: Ref<HTMLDivElement>;
  /** Updater function for language change */
  handleChangeLanguage: (language: ConsentManagerLanguageKey) => void;
  /** Set of supported languages */
  supportedLanguages: ConsentManagerLanguageKey[];
}): JSX.Element {
  // need to focus the element marked with data-initialFocus when the modal is opened
  // regular autofocus attributes caused errors, thus the data attribute usage
  // NOTE: if we want to meet a11y guidelines we will need to implement a focus trap as well
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isViewStateClosed(viewState) && dialogRef.current) {
      const shouldAutofocus = config?.autofocus !== 'off';
      const deferForHeading = peekNextFocusTarget() === 'heading';
      // This setTimeout was necessary for the api triggered states, (DoNotSell|OptOut)Disclosure
      setTimeout(() => {
        if (dialogRef.current && shouldAutofocus && !deferForHeading) {
          initialFocusElement(dialogRef.current);
        }
      }, 0);
    }
  }, [viewState, dialogRef, config.autofocus]);

  useEffect(() => {
    if (!isViewStateClosed(viewState) && dialogRef.current) {
      const modalElement = dialogRef.current;
      let currentFocusIndex = 0;

      const getFocusableElements = () => {
        const elements = modalElement.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), .button, .bottom-menu-item, h2[tabindex="-1"]'
        );
        return Array.from(elements).filter(el => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        });
      };

      const handleKeyDown = (event: KeyboardEvent) => {
        const focusableElements = getFocusableElements();

        if (event.key === 'Tab') {
          event.preventDefault();

          // Find current focus index in case focus changed externally
          const currentElement = document.activeElement;
          const newIndex = focusableElements.findIndex(el => el === currentElement);
          if (newIndex !== -1) {
            currentFocusIndex = newIndex;
          }

          if (event.shiftKey) {
            // Moving backwards
            currentFocusIndex = currentFocusIndex <= 0 ? focusableElements.length - 1 : currentFocusIndex - 1;
          } else {
            // Moving forwards
            currentFocusIndex = currentFocusIndex >= focusableElements.length - 1 ? 0 : currentFocusIndex + 1;
          }

          const elementToFocus = focusableElements[currentFocusIndex];
          if (elementToFocus) {
            elementToFocus.focus();
          }
        } else if (event.key === 'Escape') {
          handleSetViewState('close');
        }
      };

      // Set initial focus
      const setInitialFocus = () => {
        const focusableElements = getFocusableElements();

        // If a focus handoff to the heading was requested, prioritize that
        const handoff = consumeNextFocusTarget();
        if (handoff === 'heading') {
          const heading = modalElement.querySelector<HTMLElement>('#consent-dialog-title');
          if (heading) {
            // Ensure heading is programmatically focusable without requiring every component to set tabIndex
            if (!heading.hasAttribute('tabindex')) {
              heading.setAttribute('tabindex', '-1');
            }
            heading.focus();
            heading.style.outline = 'none';
            // Start tab order from the beginning on next Tab press
            currentFocusIndex = 0;
            return;
          }
        }

        const initialFocusEl = modalElement.querySelector<HTMLElement>('[data-initialFocus]');
        if (initialFocusEl) {
          initialFocusEl.focus();
          currentFocusIndex = focusableElements.indexOf(initialFocusEl);
        } else if (focusableElements.length > 0) {
          focusableElements[0].focus();
          currentFocusIndex = 0;
        }
      };

      // Ensure DOM is ready before setting focus
      setTimeout(setInitialFocus, 50);

      // Add event listener to document to catch all tab events
      document.addEventListener('keydown', handleKeyDown, true);

      // Return cleanup function
      return () => {
        document.removeEventListener('keydown', handleKeyDown, true);
      };
    } else {
      return undefined;
    }
  }, [viewState, handleSetViewState]);

  // Modal open views
  if (!isViewStateClosed(viewState)) {
    if (!isResponseViewState(viewState) && !airgap.getConsent().prompted) {
      airgap.setPrompted(true);
    }
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-dialog-title"
        className="modal-container"
        id="consentManagerMainDialog"
        ref={dialogRef}
        tabIndex={-1}
      >
        <div className="modal-container-inner" ref={bannerTopRef} tabIndex={-1}>
          <div className="inner-container">
            {viewState === 'QuickOptions' && (
              <QuickOptions
                handleSetViewState={handleSetViewState}
                globalUiVariables={globalUiVariables}
              />
            )}

            {viewState === 'AcceptAll' && (
              <AcceptAll
                handleSetViewState={handleSetViewState}
                globalUiVariables={globalUiVariables}
              />
            )}

            {viewState === 'AcceptOrRejectAnalytics' && (
              <AcceptOrRejectAnalytics
                handleSetViewState={handleSetViewState}
                globalUiVariables={globalUiVariables}
              />
            )}

            {viewState === 'AcceptOrRejectAdvertising' && (
              <AcceptOrRejectAdvertising
                handleSetViewState={handleSetViewState}
                globalUiVariables={globalUiVariables}
              />
            )}

            {viewState === 'DoNotSellExplainer' && (
              <DoNotSellExplainer
                handleSetViewState={handleSetViewState}
                fontColor={config.theme.fontColor}
                globalUiVariables={globalUiVariables}
              />
            )}

            {viewState === 'CompleteOptionsToggles' && (
              <CompleteOptionsToggles
                handleSetViewState={handleSetViewState}
                fontColor={config.theme.fontColor}
                globalUiVariables={globalUiVariables}
                mode={
                  (firstSelectedViewState === 'AcceptOrRejectAll' || firstSelectedViewState === 'AcceptAllOrMoreChoices')
                    ? 'confirm'
                    : 'immediate'
                }
              />
            )}

            {viewState === 'QuickOptions3' && (
              <QuickOptions3
                handleSetViewState={handleSetViewState}
                globalUiVariables={globalUiVariables}
              />
            )}

            {viewState === 'PrivacyPolicyNotice' && (
              <PrivacyPolicyNotice
                handleSetViewState={handleSetViewState}
                globalUiVariables={globalUiVariables}
              />
            )}

            {viewState === 'PrivacyPolicyNoticeWithCloseButton' && (
              <PrivacyPolicyNoticeWithCloseButton
                handleSetViewState={handleSetViewState}
                fontColor={config.theme.fontColor}
                globalUiVariables={globalUiVariables}
              />
            )}

            {viewState === 'AcceptOrRejectAll' && (
              <AcceptOrRejectAll
                handleSetViewState={handleSetViewState}
                globalUiVariables={globalUiVariables}
              />
            )}

            {viewState === 'AcceptAllRejectAllToggle' && (
              <AcceptAllRejectAllToggle
                handleSetViewState={handleSetViewState}
                fontColor={config.theme.fontColor}
                globalUiVariables={globalUiVariables}
              />
            )}

            {viewState === 'AcceptAllOrMoreChoices' && (
              <AcceptAllOrMoreChoices
                handleSetViewState={handleSetViewState}
                globalUiVariables={globalUiVariables}
              />
            )}

            {viewState === 'AcceptOrRejectAllOrMoreChoices' && (
              <AcceptOrRejectAllOrMoreChoices
                handleSetViewState={handleSetViewState}
                globalUiVariables={globalUiVariables}
              />
            )}

            {viewState === 'DoNotSellDisclosure' && modalOpenAuth && (
              <DoNotSellDisclosure
                handleSetViewState={handleSetViewState}
                modalOpenAuth={modalOpenAuth}
                globalUiVariables={globalUiVariables}
              />
            )}

            {viewState === 'OptOutDisclosure' && modalOpenAuth && (
              <OptOutDisclosure
                handleSetViewState={handleSetViewState}
                modalOpenAuth={modalOpenAuth}
                globalUiVariables={globalUiVariables}
              />
            )}

            {viewState === 'CompleteOptions' && (
              <CompleteOptions
                handleSetViewState={handleSetViewState}
                globalUiVariables={globalUiVariables}
              />
            )}

            {viewState === 'CompleteOptionsInverted' && (
              <CompleteOptionsInverted
                handleSetViewState={handleSetViewState}
                globalUiVariables={globalUiVariables}
              />
            )}

            {viewState === 'NoticeAndDoNotSell' && (
              <NoticeAndDoNotSell
                handleSetViewState={handleSetViewState}
                globalUiVariables={globalUiVariables}
              />
            )}

            {viewState === 'LanguageOptions' && (
              <LanguageOptions
                handleSetViewState={handleSetViewState}
                handleChangeLanguage={handleChangeLanguage}
                supportedLanguages={supportedLanguages}
              />
            )}
          </div>
          <div className="footer-container">
            <BottomMenu
              firstSelectedViewState={firstSelectedViewState}
              viewState={viewState}
              handleSetViewState={handleSetViewState}
              privacyPolicy={config.privacyPolicy}
              secondaryPolicy={config.secondaryPolicy}
              globalUiVariables={globalUiVariables}
            />
          </div>
        </div>
      </div>
    );
  }

  // Modal collapsed view
  if (viewState === 'Collapsed') {
    return (
      <Collapsed
        handleSetViewState={handleSetViewState}
        globalUiVariables={globalUiVariables}
      />
    );
  }

  // Completely hidden
  return <div />;
}
