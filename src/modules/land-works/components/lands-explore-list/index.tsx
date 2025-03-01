import { FC, MouseEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import useDebounce from '@rooks/use-debounce';

import CardsGrid from 'components/custom/cards-grid';
import { useSearchBar } from 'components/custom/search-bar/SearchBar';
import { Box, Divider, Icon, Stack, Typography } from 'design-system';
import { GridBigIcon, GridIcon } from 'design-system/icons';
import useGetIsMounted from 'hooks/useGetIsMounted';
import useIsMetamaskConnected from 'hooks/useIsMetamaskConnected';
import SplitBeeListButton from 'layout/metric/SplitBeeListButton';
import { LocationState } from 'modules/interface';
import { AssetEntity, CoordinatesLand } from 'modules/land-works/api';
import LandCardSkeleton from 'modules/land-works/components/land-base-loader-card';
import LandWorkCard from 'modules/land-works/components/land-works-card-explore-view';
import LoadMoreLands from 'modules/land-works/components/lands-explore-load-more';
import { useLandsMapTile } from 'modules/land-works/providers/lands-map-tile';
import { useLandsMapTiles } from 'modules/land-works/providers/lands-map-tiles';
import { useListingModal } from 'providers/listing-modal-provider';
import { useStickyOffset } from 'providers/sticky-offset-provider';
import { getPropertyPath } from 'router/routes';

import { AtlasTile } from '../atlas';
import { StyledButton } from './styled';
import useNumberOfLoadedCards from './useNumberOfLoadedCards';

import {
  filterLandsByAvailability,
  filterLandsByQuery,
  getAllLandsCoordinates,
  getOwnerOrConsumerId,
} from 'modules/land-works/utils';

import { THEME_COLORS } from 'themes/theme-constants';

interface Props {
  lastRentEnd: string;
  loading: boolean;
  lands: AssetEntity[];
  setPointMapCentre: (lands: CoordinatesLand[]) => void;
  isMapVisible: boolean;
}

const NUMBER_OF_CARDS_PER_LOAD = 18;

const LandsExploreList: FC<Props> = ({ loading, lands, setPointMapCentre, lastRentEnd, isMapVisible }) => {
  const history = useHistory();
  const location = useLocation<LocationState>();
  const stickyOffset = useStickyOffset();
  const { clickedLandId, setClickedLandId, setSelectedTile, setShowCardPreview } = useLandsMapTile();
  const [searchQuery] = useSearchBar();
  const { mapTiles, selectedId, setSelectedId } = useLandsMapTiles();
  const getIsMounted = useGetIsMounted();
  const timeoutIdRef = useRef<number>();
  const listingModal = useListingModal();
  const isMetamaskConnected = useIsMetamaskConnected();

  const [cardsSize, setCardsSize] = useState<'compact' | 'normal'>('normal');
  const [loadPercentageValue, setLoadPercentageValue] = useState(0);
  const [blockAutoScroll, setBlockAutoScroll] = useState(false);

  const initialNumberOfCards = isMapVisible ? (cardsSize === 'compact' ? 10 : 6) : 18;
  const [numberOfLoadedCards, setNumberOfLoadedCards] = useNumberOfLoadedCards(initialNumberOfCards);

  const handleLoadMore = () => {
    const newSlicedLands = numberOfLoadedCards + NUMBER_OF_CARDS_PER_LOAD;
    const highlights = getAllLandsCoordinates(lands.slice(0, newSlicedLands));

    setNumberOfLoadedCards(newSlicedLands);
    setPointMapCentre(highlights);
  };

  const setActiveLand = useCallback(
    (land: AssetEntity) => {
      const [landCoords] = getAllLandsCoordinates([land]);

      if (landCoords) {
        setPointMapCentre([{ id: land.id, x: landCoords.x, y: landCoords.y }]);

        if (setSelectedId) {
          setSelectedId(land.id);
        }

        if (setClickedLandId) {
          setClickedLandId(landCoords.x, landCoords.y);
        }

        const id = `${landCoords.x},${landCoords.y}`;

        if (mapTiles && mapTiles[id] && setSelectedTile) {
          setSelectedTile({
            id,
            type: mapTiles[id].type || '',
            owner: getOwnerOrConsumerId(land?.decentralandData?.asset)?.toLowerCase() || '',
          });
        }
      } else if (setSelectedId && setClickedLandId) {
        setSelectedId(land.metaverseAssetId);
        setClickedLandId(land.metaverseAssetId);
      }
    },
    [mapTiles]
  );

  const handleCardMouseOver = (e: MouseEvent<HTMLAnchorElement>, land: AssetEntity) => {
    window.clearTimeout(timeoutIdRef.current);

    if (selectedId) {
      timeoutIdRef.current = window.setTimeout(() => {
        if (getIsMounted()) {
          setActiveLand(land);
        }
      }, 500);
    } else {
      setActiveLand(land);
    }
  };

  const handleCardMouseOut = () => {
    window.clearTimeout(timeoutIdRef.current);
  };

  const getCardClickHandler = (land: AssetEntity) => {
    return () => {
      history.push({
        pathname: getPropertyPath(land.id),
        state: { from: window.location.pathname, title: 'Explore', tab: location.state?.tab },
      });
    };
  };

  const getLoadPercentageValue = () => {
    const percentage = (filteredLands.slice(0, numberOfLoadedCards).length * 100) / filteredLands.length;
    return percentage || 0;
  };

  const getLandArrayIndexByIdCoordinate = (decentralandId: AtlasTile['id']) => {
    let index = -1;

    lands.forEach((land, landIndex) => {
      land.decentralandData
        ? land.decentralandData?.coordinates.forEach((coord) => {
            if (coord.id === decentralandId.replace(',', '-')) {
              index = landIndex;
            }
          })
        : (index = landIndex);
    });

    return index;
  };

  useEffect(() => {
    setLoadPercentageValue(getLoadPercentageValue());
  }, [lands, numberOfLoadedCards, searchQuery]);

  useEffect(() => {
    setShowCardPreview && setShowCardPreview(false);
    if (!window || !clickedLandId || blockAutoScroll) return;

    if (searchQuery) {
      return setShowCardPreview && setShowCardPreview(true);
    }

    const index = getLandArrayIndexByIdCoordinate(clickedLandId);

    if (index !== -1) {
      setNumberOfLoadedCards(index > numberOfLoadedCards ? index + 1 : numberOfLoadedCards);
    }
  }, [clickedLandId]);

  let filteredLands = filterLandsByQuery(lands, searchQuery);

  if (lastRentEnd !== '0') {
    filteredLands = filterLandsByAvailability(filteredLands);
  }

  const slicedLandsInTotal = filteredLands.slice(0, numberOfLoadedCards).length;

  const saveScrollPosition = useDebounce(() => {
    if (filteredLands) sessionStorage.setItem('scroll-position', String(window.scrollY));
  }, 500);

  useEffect(() => {
    const scroll = () => {
      saveScrollPosition();
    };

    const scrollPosition = sessionStorage.getItem('scroll-position');

    if (!loading && scrollPosition && filteredLands.length) {
      window.scrollTo({ top: +scrollPosition, behavior: 'smooth' });
    }
    document.addEventListener('scroll', scroll);

    return () => {
      document.removeEventListener('scroll', scroll);
    };
  }, [loading]);

  return (
    <div
      onMouseMove={() => setBlockAutoScroll(true)}
      onMouseOut={() => setTimeout(() => setBlockAutoScroll(false), 350)}
    >
      <Box
        position="sticky"
        top={stickyOffset.offsets.filter + stickyOffset.offsets.header}
        zIndex={2}
        px={4}
        mx={-4}
        py={4}
        bgcolor="var(--theme-body-color)"
      >
        <CardsGrid sx={{ alignItems: 'center' }}>
          <Typography sx={{ order: 1, '@media (min-width: 668px)': { order: 0 } }} variant="body2" color="#B9B9D3">
            Listed{' '}
            <Typography component="span" variant="inherit" color={THEME_COLORS.light}>
              {filteredLands.length} properties
            </Typography>
          </Typography>
          <Stack gridColumn={-2} justifyContent="flex-end" direction="row" gap="12px">
            {isMetamaskConnected && (
              <>
                <SplitBeeListButton
                  sx={{ flexGrow: 1, minWidth: '0 !important' }}
                  onClick={() => listingModal.open()}
                  btnSize="medium"
                  variant="gradient"
                >
                  List Now
                </SplitBeeListButton>
                <Divider sx={{ height: 52, borderColor: '#27273A' }} orientation="vertical" />
              </>
            )}
            <StyledButton
              sx={{ flexShrink: 0 }}
              isActive={cardsSize === 'normal'}
              onClick={() => setCardsSize('normal')}
            >
              <Icon iconElement={<GridIcon />} iconSize="m" />
            </StyledButton>

            <StyledButton
              sx={{ flexShrink: 0 }}
              isActive={cardsSize === 'compact'}
              onClick={() => setCardsSize('compact')}
            >
              <Icon iconElement={<GridBigIcon />} iconSize="m" />
            </StyledButton>
          </Stack>
        </CardsGrid>
      </Box>
      <CardsGrid layout={cardsSize}>
        {loading &&
          Array.from({ length: initialNumberOfCards }, (_, i) => {
            return <LandCardSkeleton key={i} />;
          })}

        {!loading &&
          filteredLands.length > 0 &&
          filteredLands
            .slice(0, numberOfLoadedCards)
            .map((land) => (
              <LandWorkCard
                key={land.id}
                layout={cardsSize}
                onMouseOver={handleCardMouseOver}
                onMouseOut={handleCardMouseOut}
                onClick={getCardClickHandler(land)}
                land={land}
              />
            ))}
      </CardsGrid>
      {!loading && filteredLands.length === 0 && <p>No properties are currently listed</p>}
      <LoadMoreLands
        textToDisplay={`List ${slicedLandsInTotal} of ${filteredLands.length}`}
        handleLoadMore={handleLoadMore}
        percentageValue={loadPercentageValue}
        disabled={slicedLandsInTotal === filteredLands.length}
      />
    </div>
  );
};

export default LandsExploreList;
