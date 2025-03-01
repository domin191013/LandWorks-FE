import React from 'react';

import { APP_ROUTES, LANDING_ROUTES, useIsAppRoute } from 'router/routes';

export const CanIHire: React.FC = () => {
  const isAppRoute = useIsAppRoute();

  return (
    <span>
      Yes! Visit our{' '}
      <a href={isAppRoute ? APP_ROUTES.sceneBuilder : LANDING_ROUTES.sceneBuilder} target="_blank">
        Scene Builders
      </a>{' '}
      page to explore some of the best studios and individuals who are building metaverse projects.
    </span>
  );
};
