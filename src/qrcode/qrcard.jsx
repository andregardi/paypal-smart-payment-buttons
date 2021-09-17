/* @flow */
/** @jsx h */

import { h, render, Fragment } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { FUNDING } from '@paypal/sdk-constants/src';

import {
    getBody
} from '../lib';
import { QRCODE_STATE } from '../constants';

import {
    ErrorMessage,
    QRCodeElement,
    InstructionIcon,
    Logo,
    VenmoMark,
    AuthMark,
    cardStyle,
    debugging_nextStateMap,
    Survey
} from './components';


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

function useSurvey<T>() : T {
    const [ state, setState ] = useState({
        isEnabled:  false,
        reason:     'prefer_not_to_say'
    });
    const enable = () => setState({ ...state, isEnabled: true });
    const disable = () => setState({ ...state, isEnabled: false });
    const setReason = (reason) => setState({ ...state, reason });
    return { ...state, enable, disable, setReason };
}

function QRCard({
    cspNonce,
    svgString,
    debug
} : {|
    cspNonce : ?string,
    svgString : string,
    debug? : boolean
|}) : mixed {
    const { state, errorText, setState, onSubmitFeedback, close } = useXProps();
    const survey = useSurvey();
    const isError = () => {
        return state === QRCODE_STATE.ERROR;
    };

    const handleClick = (selectedFundingSource : $Values<typeof FUNDING>) => {
        window.xprops.hide();
        window.xprops.onEscapePath(selectedFundingSource).then(() => {
            window.xprops.close();
        });
    };

    const onCloseClick = () => {
        if (survey.isEnabled) {
            onSubmitFeedback(survey.reason);
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

    const content = survey.isEnabled ? surveyElement : frontView;
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
    render(
        <QRCard
            cspNonce={ cspNonce }
            svgString={ svgString }
            debug={ debug }
        />,
        getBody()
    );
}
