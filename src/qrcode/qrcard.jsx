/* @flow */
/** @jsx h */

import { h, render, Fragment } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { FUNDING, FPTI_KEY } from '@paypal/sdk-constants/src';

import { QRCODE_STATE, FPTI_CUSTOM_KEY, FPTI_TRANSITION, FPTI_STATE } from '../constants';
import { getLogger, getBody } from '../lib';
import { openPopup } from '../ui';
import { CHECKOUT_POPUP_DIMENSIONS } from '../payment-flows/checkout';

import {
    ErrorMessage,
    QRCodeElement,
    InstructionIcon,
    Logo,
    VenmoMark,
    AuthMark,
    cardStyle,
    debugging_nextStateMap
} from './components';
import { setupNativeQRLogger } from './lib/logger';
import { Survey, useSurvey } from './survey';

function useXProps<T>() : T {
    const [ xprops, setXProps ] = useState(window.xprops);
    useEffect(() => xprops.onProps(newProps => {
        setXProps({ ...newProps });
    }), []);

    function setState (newState : $Values<typeof QRCODE_STATE>) {
        setXProps({
            ...xprops,
            state: newState
        });
    }

    return {
        ...xprops,
        setState
    };
}

function QRCard({
    cspNonce,
    svgString,
    buttonSessionID,
    debug
} : {|
    cspNonce : ?string,
    svgString : string,
    buttonSessionID : string,
    debug? : boolean
|}) : mixed {

    const { state, errorText, setState, close } = useXProps();
    const survey = useSurvey();
    const isError = () => {
        return state === QRCODE_STATE.ERROR;
    };

    const handleClick = (selectedFundingSource : $Values<typeof FUNDING>) => {
        window.xprops.hide();
        const win = openPopup({ width: CHECKOUT_POPUP_DIMENSIONS.WIDTH, height: CHECKOUT_POPUP_DIMENSIONS.HEIGHT, closeOnUnload: 0 });
        window.xprops.onEscapePath(win, selectedFundingSource).then(() => {
            window.xprops.close();
        });
    };

    const onCloseClick = () => {
        if (state !== QRCODE_STATE.DEFAULT) {
            close();
        } else if (survey.isEnabled) {
            const logger = getLogger();
            logger.info(`VenmoDesktopPay_qrcode_survey`).track({
                [FPTI_KEY.STATE]:                               FPTI_STATE.BUTTON,
                [FPTI_KEY.CONTEXT_TYPE]:                        'button_session_id',
                [FPTI_KEY.CONTEXT_ID]:                          buttonSessionID,
                [FPTI_KEY.TRANSITION]:                          `${ FPTI_TRANSITION.QR_SURVEY }`,
                [FPTI_CUSTOM_KEY.DESKTOP_EXIT_SURVEY_REASON]:   survey.reason
            }).flush();
            close();
        } else {
            survey.enable();
        }
    };

    const errorMessage = (
        <ErrorMessage
            message={ errorText }
            resetFunc={ () => setState(QRCODE_STATE.DEFAULT) }
        />
    );

    const frontView = (
        <div id="front-view" className="card">
            <div id="instructions">
                <InstructionIcon stylingClass="instruction-icon" />
                <span>
                    To pay, scan the QR code with <br />your Venmo app
                </span>
            </div>
            <QRCodeElement svgString={ svgString } />
            <Logo />
        </div>
    );
    
    const surveyElement = (
        <Survey survey={ survey } onCloseClick={ onCloseClick } />
    );

    const displaySurvey = survey.isEnabled && state === QRCODE_STATE.DEFAULT;

    const content = displaySurvey ? surveyElement : frontView;
    const escapePathFooter = !survey.isEnabled && (
        <p className="escape-path">Don&apos;t have the app? Pay with <span className="escape-path__link" onClick={ () => handleClick(FUNDING.PAYPAL) }>PayPal</span> or <span className="escape-path__link" onClick={ () => handleClick(FUNDING.CARD) }>Credit/Debit card</span></p>
    );

    return (
        <Fragment>
            <style nonce={ cspNonce }> { cardStyle } </style>
            <a href="#" id="close" aria-label="close" role="button" onClick={ onCloseClick } />
            <div id="view-boxes" className={ state }>
                { isError() ? errorMessage : content }
                <div className="card" id="back-view" >
                    <span className="mark">
                        <VenmoMark />
                        <AuthMark />
                    </span>
                    
                    <div className="auth-message">
                        Go to your Venmo app and authorize
                    </div>
                    <div className="success-message">
                        Venmo account authorized
                    </div>

                </div>
                { debug && <button
                    type="button"
                    style={ { position: 'absolute', bottom: '8px', padding: '4px', right: '8px' } }
                    onClick={ () => setState(debugging_nextStateMap.get(state)) }
                >Next State</button>}
            </div>
            { escapePathFooter }
        </Fragment>
    );
}

type RenderQRCodeOptions = {|
    cspNonce? : string,
    svgString : string,
    debug : boolean
|};

export function renderQRCode({
    cspNonce = '',
    svgString,
    debug = false
} : RenderQRCodeOptions) {
    setupNativeQRLogger();
    const { buttonSessionID } = window.xprops;
    render(
        <QRCard
            cspNonce={ cspNonce }
            svgString={ svgString }
            debug={ debug }
            buttonSessionID={ buttonSessionID }
        />,
        getBody()
    );
}
