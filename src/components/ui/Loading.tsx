import React from 'react';
import clsx from 'clsx';
import './Loading.scss';

export interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  text?: string;
  className?: string;
}

const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  fullScreen = false,
  text,
  className,
}) => {
  const content = (
    <div className="loading-content">
      <div className={clsx('spinner', size)} />
      {text && <p className="loading-text">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className={clsx('full-screen', className)}>
        {content}
      </div>
    );
  }

  return <div className={clsx('loading', className)}>{content}</div>;
};

export default Loading;

