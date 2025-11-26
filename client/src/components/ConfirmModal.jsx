import React from 'react';

const backdropStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};


const boxStyle = {
  background: '#fff',
  padding: '1rem',
  borderRadius: '8px',
  maxWidth: '400px',
  width: '90%',
  boxShadow: '0 6px 18px rgba(0,0,0,0.12)'
};

const titleStyle = { margin: 0, marginBottom: '0.5rem', fontSize: '1.05rem' };
const messageStyle = { margin: 0, marginBottom: '1rem', color: '#374151' };
const actionsStyle = { display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' };

const buttonStyle = {
  padding: '0.45rem 0.8rem',
  borderRadius: '6px',
  border: 'none',
  cursor: 'pointer'
};

export default function ConfirmModal({ title = 'Confirm', message = 'Are you sure?', onConfirm, onCancel, confirmText = 'Delete', cancelText = 'Cancel' }) {
  return (
    <div style={backdropStyle} role="dialog" aria-modal="true">
      <div style={boxStyle}>
        <h3 style={titleStyle}>{title}</h3>
        <p style={messageStyle}>{message}</p>
        <div style={actionsStyle}>
          <button
            onClick={onCancel}
            style={{ ...buttonStyle, background: '#eef2ff', color: '#3730a3' }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{ ...buttonStyle, background: '#ef4444', color: '#fff' }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
