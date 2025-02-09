import React, { FC } from 'react';
import { useHistory } from 'react-router-dom';

import CardsGrid from 'components/custom/cards-grid';
import { useSearchBar } from 'components/custom/search-bar/SearchBar';
import { AssetEntity } from 'modules/land-works/api';
import LandWorksCard from 'modules/land-works/components/land-works-card-explore-view';
import LandWorksLoadingCard from 'modules/land-works/components/land-works-card-loading';
import LandsWorksGridEmptyState from 'modules/land-works/components/land-works-grid-empty-state';
import { getPropertyPath } from 'router/routes';

import useSortAssets from './useSortAssets';

import { filterLandsByQuery, getExistingLandIdInProgress, isNewLandTxInProgress } from 'modules/land-works/utils';

interface ListedTabContentProps {
  assets: AssetEntity[];
}

const ListedTabContent: FC<ListedTabContentProps> = ({ assets }) => {
  const history = useHistory();
  const [search] = useSearchBar();
  const isListingInProgress = isNewLandTxInProgress(assets, 'LISTING_IN_PROGRESS');
  const landIdInWithdraw = getExistingLandIdInProgress(assets, 'WITHDRAW_IN_PROGRESS');

  const filteredAssets = filterLandsByQuery(assets, search);
  const sortedAssets = useSortAssets(filteredAssets);

  return assets.length > 0 || isListingInProgress ? (
    <CardsGrid>
      {sortedAssets.map((asset) => {
        if (landIdInWithdraw === asset.metaverseAssetId) {
          return <LandWorksLoadingCard key={asset.metaverseAssetId} title="Withdraw" />;
        } else {
          return (
            <LandWorksCard
              key={asset.id}
              land={asset}
              onClick={() =>
                history.push({
                  pathname: getPropertyPath(asset.id),
                  state: {
                    from: window.location.pathname,
                    title: 'My properties',
                  },
                })
              }
            />
          );
        }
      })}
      {isListingInProgress && <LandWorksLoadingCard title="Listing" />}
    </CardsGrid>
  ) : (
    <LandsWorksGridEmptyState />
  );
};

export default ListedTabContent;
